import { createServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import express from 'express'
import { makeGame, cloneGame, replenishHand, doWithdraw, ck, sharedTraits } from '../src/game/logic.ts'
import { I18N } from '../src/i18n.ts'
import type { GameState } from '../src/game/types.ts'

const app = express()
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

const t = I18N['it']

// ── Room ───────────────────────────────────────────────────────────────────────

interface Room {
  id: string
  game: GameState
  sockets: string[]   // socket.id, index = player index
  maxPlayers: number
  started: boolean
}

const rooms = new Map<string, Room>()

function findRoom(socketId: string): Room | undefined {
  for (const r of rooms.values()) if (r.sockets.includes(socketId)) return r
  return undefined
}

function broadcast(room: Room) {
  io.to(room.id).emit('state', room.game)
}

// End the current turn: hand off to the next player, reset to place phase.
function endTurn(g: GameState) {
  if (g.gameOver) return
  g.turn = (g.turn + 1) % g.numPlayers
  g.phase = 'place'
  g.placedPos = null
  g.selIdx = -1
}

// Single room for the spike — replaced on restart
function getRoom(id = 'main', max = 2): Room {
  if (!rooms.has(id)) {
    rooms.set(id, { id, game: makeGame(max), sockets: [], maxPlayers: max, started: false })
  }
  return rooms.get(id)!
}

// ── Connection ─────────────────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  console.log(`[+] ${socket.id}`)

  const room = getRoom()

  if (room.sockets.length >= room.maxPlayers) {
    socket.emit('room_full')
    socket.disconnect()
    return
  }

  const playerIdx = room.sockets.length
  room.sockets.push(socket.id)
  socket.join(room.id)

  socket.emit('assigned', { playerIdx, numPlayers: room.maxPlayers })
  console.log(`    → player ${playerIdx}`)

  if (room.sockets.length === room.maxPlayers) {
    // Fresh deck for every match, even if this room object was reused.
    room.game = makeGame(room.maxPlayers)
    room.started = true
    broadcast(room)
  } else {
    socket.emit('waiting', { waiting: room.maxPlayers - room.sockets.length })
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  socket.on('place_card', ({ q, r, cardIdx, conquer }: { q: number; r: number; cardIdx: number; conquer: boolean }) => {
    const room = findRoom(socket.id)
    if (!room?.started) return
    const g = room.game
    const pi = room.sockets.indexOf(socket.id)
    if (g.turn !== pi || g.phase !== 'place') return

    const card = g.hands[pi][cardIdx]
    if (!card) return
    const k = ck(q, r)

    const ng = cloneGame(g)
    if (conquer) {
      // Conquer requires an existing card, a free token, and ≥2 shared traits.
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
      if (ng.board[k]) return  // cell must be empty for a normal placement
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
  })

  socket.on('place_meeple', () => {
    const room = findRoom(socket.id)
    if (!room?.started) return
    const g = room.game
    const pi = room.sockets.indexOf(socket.id)
    if (g.turn !== pi || g.phase !== 'meeple' || !g.placedPos || g.tokens[pi] <= 0) return

    const ng = cloneGame(g)
    const k = ck(ng.placedPos!.q, ng.placedPos!.r)
    if (ng.meeples[k] === undefined) { ng.meeples[k] = pi; ng.tokens[pi]-- }
    replenishHand(ng, pi)
    endTurn(ng)
    room.game = ng
    broadcast(room)
  })

  socket.on('skip_meeple', () => {
    const room = findRoom(socket.id)
    if (!room?.started) return
    const g = room.game
    const pi = room.sockets.indexOf(socket.id)
    if (g.turn !== pi || g.phase !== 'meeple') return

    const ng = cloneGame(g)
    replenishHand(ng, pi)
    endTurn(ng)
    room.game = ng
    broadcast(room)
  })

  socket.on('withdraw', ({ q, r }: { q: number; r: number }) => {
    const room = findRoom(socket.id)
    if (!room?.started) return
    const g = room.game
    const pi = room.sockets.indexOf(socket.id)
    // Withdraw is a meeple-phase action (you place a card first, then may
    // retrieve one of your meeples to score instead of placing a new one).
    if (g.turn !== pi || (g.phase !== 'meeple' && g.phase !== 'withdraw')) return
    if (g.meeples[ck(q, r)] !== pi) return

    const ng = cloneGame(g)
    doWithdraw(ng, pi, ck(q, r), t)
    if (!ng.gameOver) { replenishHand(ng, pi); endTurn(ng) }
    room.game = ng
    broadcast(room)
  })

  socket.on('restart', () => {
    const room = findRoom(socket.id)
    if (!room) return
    room.game = makeGame(room.maxPlayers)
    broadcast(room)
  })

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`)
    const room = findRoom(socket.id)
    if (!room) return
    room.sockets = room.sockets.filter(id => id !== socket.id)
    room.started = false
    io.to(room.id).emit('player_left')
    // Drop fully-vacated rooms so the next pair gets a fresh game.
    if (room.sockets.length === 0) rooms.delete(room.id)
  })
})

const PORT = process.env.PORT ?? 3001
httpServer.listen(PORT, () => console.log(`Formidable server → http://localhost:${PORT}`))
