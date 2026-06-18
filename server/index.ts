import { createServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import express from 'express'
import { makeGame, cloneGame, replenishHand, doWithdraw, ck, sharedTraits } from '../src/game/logic.ts'
import { runCpuTurn, type Difficulty } from '../src/game/ai.ts'
import { I18N } from '../src/i18n.ts'
import type { GameState, Card } from '../src/game/types.ts'

const app = express()
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

const t = I18N['it']

// Pacing between consecutive bot moves so humans can follow what's happening.
const BOT_STEP_MS = 650

// ── Room model ───────────────────────────────────────────────────────────────

interface PlayerSlot {
  type: 'human' | 'bot'
  socketId: string | null   // set for occupied human slots
}

interface Room {
  code: string
  game: GameState
  players: PlayerSlot[]      // index === player index in the game
  difficulty: Difficulty
  started: boolean
}

const rooms = new Map<string, Room>()

// Humans occupy the low indices, bots the high ones.
function humanSlots(room: Room): PlayerSlot[] {
  return room.players.filter(p => p.type === 'human')
}
function humansJoined(room: Room): number {
  return room.players.filter(p => p.type === 'human' && p.socketId).length
}
function humansNeeded(room: Room): number {
  return humanSlots(room).length - humansJoined(room)
}

function findSlot(socketId: string): { room: Room; idx: number } | null {
  for (const room of rooms.values()) {
    const idx = room.players.findIndex(p => p.socketId === socketId)
    if (idx >= 0) return { room, idx }
  }
  return null
}

// Unambiguous code (no 0/O/1/I).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function makeCode(): string {
  let code = ''
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
  } while (rooms.has(code))
  return code
}

// ── State broadcast (with per-player hand redaction) ─────────────────────────
// Each human only ever receives their own hand; opponents' cards are stripped
// so a tampered client cannot read them.

const FACE_DOWN: Card[] = []
function redactFor(g: GameState, forIdx: number): GameState {
  return {
    ...g,
    hands: g.hands.map((h, i) => (i === forIdx ? h : FACE_DOWN)),
  }
}

function broadcast(room: Room) {
  room.players.forEach((slot, i) => {
    if (slot.type === 'human' && slot.socketId) {
      io.to(slot.socketId).emit('state', redactFor(room.game, i))
    }
  })
}

function emitLobby(room: Room) {
  room.players.forEach((slot) => {
    if (slot.type === 'human' && slot.socketId) {
      io.to(slot.socketId).emit('lobby', {
        code: room.code,
        joined: humansJoined(room),
        needed: humansNeeded(room),
        players: room.players.map(p => p.type),
      })
    }
  })
}

// ── Turn flow ────────────────────────────────────────────────────────────────

function endTurn(g: GameState) {
  if (g.gameOver) return
  g.turn = (g.turn + 1) % g.numPlayers
  g.phase = 'place'
  g.placedPos = null
  g.selIdx = -1
}

// If the current turn belongs to a bot, play it (paced), then recurse.
function runBotsIfNeeded(room: Room) {
  const g = room.game
  if (g.gameOver) return
  if (room.players[g.turn]?.type !== 'bot') return

  setTimeout(() => {
    // Room may have been torn down while we waited.
    if (rooms.get(room.code) !== room || g.gameOver) return
    if (room.players[room.game.turn]?.type !== 'bot') return

    const ng = cloneGame(room.game)
    const idx = ng.turn
    const desc = runCpuTurn(ng, idx, t, room.difficulty)
    ng.log = [...ng.log, desc]
    endTurn(ng)
    room.game = ng
    broadcast(room)
    runBotsIfNeeded(room)
  }, BOT_STEP_MS)
}

function startGame(room: Room) {
  room.game = makeGame(room.players.length)
  room.started = true
  broadcast(room)
  runBotsIfNeeded(room)
}

// ── Action guards ────────────────────────────────────────────────────────────
// Returns the room + player index if this socket may act now, else null.

function actor(socketId: string): { room: Room; pi: number } | null {
  const found = findSlot(socketId)
  if (!found || !found.room.started) return null
  return { room: found.room, pi: found.idx }
}

// ── Connection ───────────────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  console.log(`[+] ${socket.id}`)

  socket.on('create_room', ({ humans, bots, difficulty }: { humans: number; bots: number; difficulty: Difficulty }) => {
    const h = Math.max(1, Math.min(4, humans | 0))
    const b = Math.max(0, Math.min(3, bots | 0))
    const total = h + b
    if (total < 2 || total > 4) { socket.emit('join_error', { reason: 'Numero di giocatori non valido' }); return }

    const code = makeCode()
    const players: PlayerSlot[] = [
      ...Array.from({ length: h }, () => ({ type: 'human' as const, socketId: null })),
      ...Array.from({ length: b }, () => ({ type: 'bot' as const, socketId: null })),
    ]
    const room: Room = { code, game: makeGame(total), players, difficulty: difficulty ?? 'medium', started: false }
    rooms.set(code, room)

    // Creator takes the first human slot.
    room.players[0].socketId = socket.id
    socket.join(code)
    socket.emit('assigned', { playerIdx: 0, numPlayers: total, code, players: room.players.map(p => p.type) })
    console.log(`    created room ${code} (${h}H + ${b}B) → player 0`)

    if (humansNeeded(room) === 0) startGame(room)
    else emitLobby(room)
  })

  socket.on('join_room', ({ code }: { code: string }) => {
    const room = rooms.get((code ?? '').toUpperCase().trim())
    if (!room)            { socket.emit('join_error', { reason: 'Stanza inesistente' }); return }
    if (room.started)     { socket.emit('join_error', { reason: 'Partita già iniziata' }); return }
    const slotIdx = room.players.findIndex(p => p.type === 'human' && !p.socketId)
    if (slotIdx < 0)      { socket.emit('join_error', { reason: 'Stanza piena' }); return }

    room.players[slotIdx].socketId = socket.id
    socket.join(room.code)
    socket.emit('assigned', { playerIdx: slotIdx, numPlayers: room.players.length, code: room.code, players: room.players.map(p => p.type) })
    console.log(`    ${socket.id} joined ${room.code} → player ${slotIdx}`)

    if (humansNeeded(room) === 0) startGame(room)
    else emitLobby(room)
  })

  // ── Game actions ─────────────────────────────────────────────────────────────

  socket.on('place_card', ({ q, r, cardIdx, conquer }: { q: number; r: number; cardIdx: number; conquer: boolean }) => {
    const a = actor(socket.id); if (!a) return
    const { room, pi } = a
    const g = room.game
    if (g.turn !== pi || g.phase !== 'place') return

    const card = g.hands[pi][cardIdx]
    if (!card) return
    const k = ck(q, r)

    const ng = cloneGame(g)
    if (conquer) {
      const target = ng.board[k]
      if (!target || ng.meeples[k] !== undefined || ng.tokens[pi] <= 0 || sharedTraits(card, target) < 2) return
      ng.discard.push(target)
      ng.conquered[k] = true
      ng.board[k] = card
      ng.hands[pi].splice(cardIdx, 1)
      ng.placedPos = { q, r }
      ng.meeples[k] = pi
      ng.tokens[pi]--
      replenishHand(ng, pi)
      endTurn(ng)
    } else {
      if (ng.board[k]) return
      ng.board[k] = card
      ng.hands[pi].splice(cardIdx, 1)
      ng.placedPos = { q, r }
      const onBoard = Object.values(ng.meeples).filter(v => v === pi).length
      if (ng.tokens[pi] > 0 && onBoard === 0) {
        ng.meeples[k] = pi
        ng.tokens[pi]--
        replenishHand(ng, pi)
        endTurn(ng)
      } else {
        ng.phase = 'meeple'
      }
    }
    room.game = ng
    broadcast(room)
    runBotsIfNeeded(room)
  })

  socket.on('place_meeple', () => {
    const a = actor(socket.id); if (!a) return
    const { room, pi } = a
    const g = room.game
    if (g.turn !== pi || g.phase !== 'meeple' || !g.placedPos || g.tokens[pi] <= 0) return

    const ng = cloneGame(g)
    const k = ck(ng.placedPos!.q, ng.placedPos!.r)
    if (ng.meeples[k] === undefined) { ng.meeples[k] = pi; ng.tokens[pi]-- }
    replenishHand(ng, pi)
    endTurn(ng)
    room.game = ng
    broadcast(room)
    runBotsIfNeeded(room)
  })

  socket.on('skip_meeple', () => {
    const a = actor(socket.id); if (!a) return
    const { room, pi } = a
    const g = room.game
    if (g.turn !== pi || g.phase !== 'meeple') return

    const ng = cloneGame(g)
    replenishHand(ng, pi)
    endTurn(ng)
    room.game = ng
    broadcast(room)
    runBotsIfNeeded(room)
  })

  socket.on('withdraw', ({ q, r }: { q: number; r: number }) => {
    const a = actor(socket.id); if (!a) return
    const { room, pi } = a
    const g = room.game
    if (g.turn !== pi || (g.phase !== 'meeple' && g.phase !== 'withdraw')) return
    if (g.meeples[ck(q, r)] !== pi) return

    const ng = cloneGame(g)
    doWithdraw(ng, pi, ck(q, r), t)
    if (!ng.gameOver) { replenishHand(ng, pi); endTurn(ng) }
    room.game = ng
    broadcast(room)
    runBotsIfNeeded(room)
  })

  socket.on('restart', () => {
    const found = findSlot(socket.id)
    if (!found) return
    startGame(found.room)
  })

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`)
    const found = findSlot(socket.id)
    if (!found) return
    const { room, idx } = found
    room.players[idx].socketId = null

    if (room.started) {
      // A human bailed mid-game — tear the match down for everyone.
      io.to(room.code).emit('player_left')
      rooms.delete(room.code)
    } else {
      // Still in the lobby: free the slot, keep waiting.
      if (humansJoined(room) === 0) rooms.delete(room.code)
      else emitLobby(room)
    }
  })
})

const PORT = process.env.PORT ?? 3001
httpServer.listen(PORT, () => console.log(`Formidable server → http://localhost:${PORT}`))
