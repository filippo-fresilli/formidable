import { useState, useEffect } from 'react'
import { socket } from './socket'
import type { Difficulty } from './ai'
import type { GameState } from './types'

// ── State transposition ────────────────────────────────────────────────────────
// Remaps the server's game state so the local player always appears as player 0.
// This lets App.tsx reuse all its "player 0" rendering logic without changes.

function transposeForPlayer(g: GameState, myIdx: number): GameState {
  if (myIdx === 0) return g
  const n = g.numPlayers
  // new[i] = server[(i + myIdx) % n]
  const shift = (arr: unknown[]) => Array.from({ length: n }, (_, i) => arr[(i + myIdx) % n])
  // meeple owner: server X → transposed (X - myIdx + n) % n
  const remapOwner = (x: number) => (x - myIdx + n) % n
  return {
    ...g,
    turn: (g.turn - myIdx + n) % n,
    scores: shift(g.scores) as number[],
    hands: shift(g.hands) as GameState['hands'],
    tokens: shift(g.tokens) as number[],
    meeples: Object.fromEntries(
      Object.entries(g.meeples).map(([k, v]) => [k, remapOwner(v)])
    ),
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export type OnlineStatus = 'disconnected' | 'connecting' | 'lobby' | 'playing' | 'error'

export interface LobbyInfo {
  code: string
  joined: number
  needed: number
  players: ('human' | 'bot')[]
}

export interface UseOnlineGameResult {
  gs: GameState | null
  status: OnlineStatus
  playerIdx: number | null
  code: string | null
  lobby: LobbyInfo | null
  /** Server-order player slot types (index = server player index) */
  playerTypes: ('human' | 'bot')[] | null
  errorMsg: string | null
  createRoom: (opts: { humans: number; bots: number; difficulty: Difficulty }) => void
  joinRoom: (code: string) => void
  disconnect: () => void
  placeCard: (q: number, r: number, conquer: boolean) => void
  placeMeeple: () => void
  skipMeeple: () => void
  playerWithdraw: (q: number, r: number) => void
  selectCard: (i: number) => void
  restart: () => void
}

export function useOnlineGame(): UseOnlineGameResult {
  const [serverGs, setServerGs]   = useState<GameState | null>(null)
  const [playerIdx, setPlayerIdx] = useState<number | null>(null)
  const [code, setCode]           = useState<string | null>(null)
  const [lobby, setLobby]         = useState<LobbyInfo | null>(null)
  const [playerTypes, setPlayerTypes] = useState<('human' | 'bot')[] | null>(null)
  const [status, setStatus]       = useState<OnlineStatus>('disconnected')
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  // selIdx is purely local UI state — server doesn't need it
  const [selIdx, setSelIdx]       = useState(-1)

  // Pending action queued while the socket is still connecting.
  const [pending, setPending]     = useState<(() => void) | null>(null)

  useEffect(() => {
    socket.on('connect',     () => { setStatus(s => (s === 'disconnected' ? 'connecting' : s)) })
    socket.on('disconnect',  () => { setStatus('disconnected'); setServerGs(null); setPlayerIdx(null); setLobby(null); setCode(null); setPlayerTypes(null) })
    socket.on('assigned',    ({ playerIdx: pi, code: c, players }: { playerIdx: number; code: string; players: ('human' | 'bot')[] }) => {
      setPlayerIdx(pi); setCode(c); setPlayerTypes(players); setStatus('lobby')
    })
    socket.on('lobby',       (info: LobbyInfo) => { setLobby(info); setStatus('lobby') })
    socket.on('state',       (g: GameState)   => { setServerGs(g); setStatus('playing'); setSelIdx(-1) })
    socket.on('join_error',  ({ reason }: { reason: string }) => { setStatus('error'); setErrorMsg(reason) })
    socket.on('player_left', () => { setStatus('error'); setErrorMsg('Un giocatore ha abbandonato') })

    return () => {
      socket.off('connect'); socket.off('disconnect'); socket.off('assigned')
      socket.off('lobby'); socket.off('state'); socket.off('join_error'); socket.off('player_left')
    }
  }, [])

  // Fire any queued emit once connected.
  useEffect(() => {
    if (status === 'connecting' && pending) { pending(); setPending(null) }
  }, [status, pending])

  // Transposed view: local player always appears as player 0
  const gs = serverGs && playerIdx !== null
    ? { ...transposeForPlayer(serverGs, playerIdx), selIdx }
    : null

  const isMyTurn = gs !== null && gs.turn === 0 && !gs.gameOver

  // Connect (if needed) then run `emit` — queued until the socket is live.
  function connectThen(emit: () => void) {
    setErrorMsg(null)
    if (socket.connected) { emit() }
    else { setPending(() => emit); setStatus('connecting'); socket.connect() }
  }

  function createRoom(opts: { humans: number; bots: number; difficulty: Difficulty }) {
    connectThen(() => socket.emit('create_room', opts))
  }
  function joinRoom(c: string) {
    connectThen(() => socket.emit('join_room', { code: c }))
  }
  function disconnect() { socket.disconnect() }

  function selectCard(i: number) {
    if (!isMyTurn || gs?.phase !== 'place') return
    setSelIdx(prev => prev === i ? -1 : i)
  }

  function placeCard(q: number, r: number, conquer: boolean) {
    if (!isMyTurn || gs?.phase !== 'place' || selIdx < 0) return
    setSelIdx(-1)
    socket.emit('place_card', { q, r, cardIdx: selIdx, conquer })
  }

  function placeMeeple() {
    if (!isMyTurn || gs?.phase !== 'meeple') return
    socket.emit('place_meeple')
  }

  function skipMeeple() {
    if (!isMyTurn || gs?.phase !== 'meeple') return
    socket.emit('skip_meeple')
  }

  function playerWithdraw(q: number, r: number) {
    // Withdraw happens during the meeple phase (after placing a card), not place.
    if (!isMyTurn || (gs?.phase !== 'meeple' && gs?.phase !== 'withdraw')) return
    socket.emit('withdraw', { q, r })
  }

  function restart() { socket.emit('restart') }

  return {
    gs, status, playerIdx, code, lobby, playerTypes, errorMsg,
    createRoom, joinRoom, disconnect,
    placeCard, placeMeeple, skipMeeple, playerWithdraw, selectCard, restart,
  }
}
