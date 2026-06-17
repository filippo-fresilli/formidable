import { useState, useReducer, useRef, useCallback, useEffect, type RefObject } from 'react'
import { I18N, type Lang } from '../i18n'
import { makeGame, cloneGame, replenishHand, doWithdraw, ck } from './logic'
import { dailyRng } from './daily'
import { runCpuTurn, type Difficulty } from './ai'
import { clearSave } from './storage'
import { playSound } from './sounds'
import type { GameState, HistoryState, HistoryAction, Flash } from './types'
import type { WithdrawResult } from './logic'

// Delay between consecutive bot turns so their moves are visible to the player.
const CPU_STEP_MS = 500

// ── History reducer ────────────────────────────────────────────────────────────

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'COMMIT': return { past: [...state.past, state.present], present: action.game, future: [] }
    // Like COMMIT but does NOT push to history — used for intermediate bot turns
    // so the whole CPU sequence collapses into a single undo step.
    case 'REPLACE': return { past: state.past, present: action.game, future: [] }
    case 'UNDO':
      if (!state.past.length) return state
      return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future] }
    case 'REDO':
      if (!state.future.length) return state
      return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) }
    case 'RESET': return { past: [], present: action.game, future: [] }
    default: return state
  }
}

// ── Hook interface ─────────────────────────────────────────────────────────────

interface UseGameOptions {
  initialState: HistoryState
  /** Mutable ref so action closures always see the current value */
  numPlayersRef: RefObject<number>
  mutedRef: RefObject<boolean>
  langRef: RefObject<Lang>
  difficultyRef: RefObject<Difficulty>
  /** True only during the very first onboarding; prevents CPU from running early */
  initialOnboardingRef: RefObject<boolean>
  /** Called when the player places a card (starts the timer) */
  onTimerStart: () => void
  /** Called after restart so App can reset timer/win/resume UI state */
  onRestart: (numPlayers: number) => void
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useGame({
  initialState,
  numPlayersRef,
  mutedRef,
  langRef,
  difficultyRef,
  initialOnboardingRef,
  onTimerStart,
  onRestart,
}: UseGameOptions) {
  const [hist, dispatch] = useReducer(historyReducer, initialState)
  const [cpuBusy, setCpuBusy] = useState(false)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [isDaily, setIsDaily] = useState(false)
  const cpuRef = useRef(false)
  // Daily challenge forces a fixed, deterministic bot difficulty (medium) so the
  // game plays identically for everyone on the same seed.
  const dailyRef = useRef(false)
  const gs = hist.present

  // ── CPU executor ────────────────────────────────────────────────────────────

  const executeCpu = useCallback((baseGame: GameState) => {
    if (cpuRef.current) return
    if (!baseGame || baseGame.turn === 0 || baseGame.gameOver) return
    cpuRef.current = true
    setCpuBusy(true)
    const tLocal = I18N[langRef.current!]
    const diff: Difficulty = dailyRef.current ? 'medium' : difficultyRef.current!

    // Run ONE bot's full turn, make it visible, then pause ~half a second before
    // the next bot — so the player can follow who is playing and what they do.
    const step = (prev: GameState) => {
      const g = cloneGame(prev)
      const idx = g.turn
      const desc = runCpuTurn(g, idx, tLocal, diff)
      g.log = [...g.log, desc]
      if (g.gameOver) {
        g.turn = idx
      } else {
        const next = (idx + 1) % g.numPlayers
        g.turn = next
        if (next === 0) { g.phase = 'place'; g.placedPos = null; g.selIdx = -1 }
      }
      // REPLACE (not COMMIT): the whole bot sequence stays a single undo step.
      dispatch({ type: 'REPLACE', game: g })
      if (!g.gameOver && g.turn !== 0) {
        setTimeout(() => step(g), CPU_STEP_MS)
      } else {
        cpuRef.current = false
        setCpuBusy(false)
      }
    }

    setTimeout(() => step(baseGame), CPU_STEP_MS)
  }, [langRef, difficultyRef])

  // Run CPU on first mount if a resumed game starts on a bot turn
  const initDone = useRef(false)
  useEffect(() => {
    if (!initDone.current) {
      initDone.current = true
      if (gs.turn !== 0 && !gs.gameOver && !initialOnboardingRef.current) executeCpu(gs)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Player action helper ────────────────────────────────────────────────────

  function playerAction(mutateFn: (g: GameState) => void | false) {
    if (cpuRef.current) return
    const g = cloneGame(gs)
    const result = mutateFn(g)
    if (result === false) return
    if (g.lastAction) { g.log = [...g.log, g.lastAction]; delete g.lastAction }
    dispatch({ type: 'COMMIT', game: g })
    if (g.turn !== 0 && !g.gameOver) executeCpu(g)
  }

  // ── Player actions ──────────────────────────────────────────────────────────

  function placeCard(q: number, r: number, conquer: boolean) {
    if (cpuRef.current) return
    onTimerStart()
    const t = I18N[langRef.current!]
    playSound(conquer ? 'conquer' : 'place', mutedRef.current!)
    playerAction((g) => {
      if (g.selIdx < 0 || g.turn !== 0) return false
      const k = ck(q, r)
      const card = g.hands[0][g.selIdx]
      const label = `${t.colorNames[card.oc]} ${t.shapeNames[card.os]}`
      if (conquer) {
        g.discard.push(g.board[k]); g.conquered[k] = true
        g.board[k] = card; g.hands[0].splice(g.selIdx, 1)
        g.selIdx = -1; g.placedPos = { q, r }
        g.meeples[k] = 0; g.tokens[0]--
        replenishHand(g, 0); g.phase = 'draw'; g.turn = 1
        g.lastAction = `G1 ⚔️ (${q},${r}) "${label}"`
      } else {
        g.board[k] = card; g.hands[0].splice(g.selIdx, 1)
        g.selIdx = -1; g.placedPos = { q, r }
        const myOnBoard = Object.values(g.meeples).filter((v) => v === 0).length
        if (g.tokens[0] > 0 && myOnBoard === 0) {
          g.meeples[k] = 0; g.tokens[0]--
          replenishHand(g, 0); g.phase = 'draw'; g.turn = 1
          g.lastAction = `G1 → (${q},${r}) "${label}" · ● auto`
        } else {
          g.phase = 'meeple'
          g.lastAction = `G1 → (${q},${r}) "${label}"`
        }
      }
    })
  }

  function placeMeeple() {
    playSound('meeple', mutedRef.current!)
    playerAction((g) => {
      if (g.placedPos && g.tokens[0] > 0) {
        const k = ck(g.placedPos.q, g.placedPos.r)
        if (g.meeples[k] === undefined) { g.meeples[k] = 0; g.tokens[0]-- }
      }
      replenishHand(g, 0); g.phase = 'draw'; g.turn = 1
      g.lastAction = `G1 ● (${g.placedPos?.q},${g.placedPos?.r})`
    })
  }

  function skipMeeple() {
    playerAction((g) => { replenishHand(g, 0); g.phase = 'draw'; g.turn = 1; g.lastAction = 'G1 skip' })
  }

  function playerWithdraw(q: number, r: number) {
    const t = I18N[langRef.current!]
    playSound('withdraw', mutedRef.current!)
    let res: WithdrawResult | null = null
    playerAction((g) => {
      res = doWithdraw(g, 0, ck(q, r), t)
      const pd = res.pts > 0 ? res.details.join(', ') : '0 pt'
      g.lastAction = `G1 ↩ (${q},${r})${res.isConq ? ' 🔥' : ''} +${res.pts}pt (${pd}) tot ${g.scores[0]}`
      if (!g.gameOver) { replenishHand(g, 0); g.phase = 'draw'; g.turn = 1 }
    })
    // Transient score/burn animation (cleared after it plays)
    const r2 = res as WithdrawResult | null
    if (r2 && (r2.pts > 0 || r2.burnCells.length > 0)) {
      const f: Flash = { id: Date.now(), pts: r2.pts, key: ck(q, r), scoreCells: r2.scoreCells, burnCells: r2.burnCells }
      setFlash(f)
      setTimeout(() => setFlash((cur) => (cur && cur.id === f.id ? null : cur)), 1000)
    }
  }

  function selectCard(i: number) {
    if (cpuRef.current || gs.phase !== 'place') return
    playSound('select', mutedRef.current!)
    const g = cloneGame(gs); g.selIdx = g.selIdx === i ? -1 : i
    dispatch({ type: 'COMMIT', game: g })
  }

  function restart(np2?: number) {
    const n = np2 ?? numPlayersRef.current!
    clearSave()
    cpuRef.current = false
    setCpuBusy(false)
    setFlash(null)
    dailyRef.current = false
    setIsDaily(false)
    const newGame = makeGame(n)
    dispatch({ type: 'RESET', game: newGame })
    onRestart(n)
    if (newGame.turn !== 0) executeCpu(newGame)
  }

  // Start today's daily challenge: 2 players, seeded deck, deterministic bot.
  function startDaily() {
    clearSave()
    cpuRef.current = false
    setCpuBusy(false)
    setFlash(null)
    dailyRef.current = true
    setIsDaily(true)
    const newGame = makeGame(2, dailyRng())
    dispatch({ type: 'RESET', game: newGame })
    onRestart(2)
    if (newGame.turn !== 0) executeCpu(newGame)
  }

  function undo() { dispatch({ type: 'UNDO' }) }
  function redo() { dispatch({ type: 'REDO' }) }

  return {
    gs,
    flash,
    isDaily,
    startDaily,
    busy: cpuBusy || cpuRef.current,
    cpuBusy,
    canBack: hist.past.length > 0,
    canFwd: hist.future.length > 0,
    placeCard,
    placeMeeple,
    skipMeeple,
    playerWithdraw,
    selectCard,
    restart,
    undo,
    redo,
  }
}
