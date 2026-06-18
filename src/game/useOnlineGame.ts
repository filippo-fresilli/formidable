import { useState, useEffect } from 'react'
import { socket } from './socket'
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

export type OnlineStatus = 'disconnected' | 'connecting' | 'waiting' | 'playing' | 'error'

export interface UseOnlineGameResult {
  gs: GameState | null
  status: OnlineStatus
  playerIdx: number | null
  errorMsg: string | null
  connect: () => void
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
  const [status, setStatus]       = useState<OnlineStatus>('disconnected')
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  // selIdx is purely local UI state — server doesn't need it
  const [selIdx, setSelIdx]       = useState(-1)

  useEffect(() => {
    socket.on('connect',     () => setStatus('connecting'))
    socket.on('disconnect',  () => { setStatus('disconnected'); setServerGs(null); setPlayerIdx(null) })
    socket.on('assigned',    ({ playerIdx: pi }: { playerIdx: number }) => {
      setPlayerIdx(pi); setStatus('waiting')
    })
    socket.on('waiting',     () => setStatus('waiting'))
    socket.on('state',       (g: GameState) => { setServerGs(g); setStatus('playing'); setSelIdx(-1) })
    socket.on('room_full',   () => { setStatus('error'); setErrorMsg('Stanza piena') })
    socket.on('player_left', () => { setStatus('error'); setErrorMsg('Un giocatore ha abbandonato') })

    return () => {
      socket.off('connect'); socket.off('disconnect'); socket.off('assigned')
      socket.off('waiting'); socket.off('state'); socket.off('room_full'); socket.off('player_left')
    }
  }, [])

  // Transposed view: local player always appears as player 0
  const gs = serverGs && playerIdx !== null
    ? { ...transposeForPlayer(serverGs, playerIdx), selIdx }
    : null

  const isMyTurn = gs !== null && gs.turn === 0 && !gs.gameOver

  function connect()    { setErrorMsg(null); socket.connect() }
  function disconnect() { socket.disconnect() }

  function selectCard(i: number) {
    if (!isMyTurn || gs?.phase !== 'place') return
    setSelIdx(prev => prev === i ? -1 : i)
  }

  function placeCard(q: number, r: number, conquer: boolean) {
    if (!isMyTurn || gs?.phase !== 'place' || selIdx < 0) return
    // Reset local selIdx immediately; server will echo back new state
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

  return { gs, status, playerIdx, errorMsg, connect, disconnect, placeCard, placeMeeple, skipMeeple, playerWithdraw, selectCard, restart }
}
