import { useState, useReducer, useRef, useCallback, useEffect, type RefObject } from 'react'
import { I18N, type Lang } from '../i18n'
import { makeGame, cloneGame, replenishHand, doWithdraw, ck } from './logic'
import { runCpuTurn, type Difficulty } from './ai'
import { clearSave } from './storage'
import { playSound } from './sounds'
import type { GameState, HistoryState, HistoryAction } from './types'

// ── History reducer ────────────────────────────────────────────────────────────

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'COMMIT': return { past: [...state.past, state.present], present: action.game, future: [] }
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
  const cpuRef = useRef(false)
  const gs = hist.present

  // ── CPU executor ────────────────────────────────────────────────────────────

  const executeCpu = useCallback((baseGame: GameState) => {
    if (cpuRef.current) return
    if (!baseGame || baseGame.turn === 0 || baseGame.gameOver) return
    cpuRef.current = true
    setCpuBusy(true)
    const tLocal = I18N[langRef.current!]
    const diff = difficultyRef.current!
    setTimeout(() => {
      const g = cloneGame(baseGame)
      let idx = g.turn
      const entries: string[] = []
      while (idx !== 0) {
        const desc = runCpuTurn(g, idx, tLocal, diff)
        entries.push(desc)
        if (g.gameOver) { g.turn = idx; break }
        idx = (idx + 1) % g.numPlayers
        g.turn = idx
      }
      if (!g.gameOver) { g.turn = 0; g.phase = 'place'; g.placedPos = null; g.selIdx = -1 }
      g.log = [...g.log, ...entries]
      dispatch({ type: 'COMMIT', game: g })
      cpuRef.current = false
      setCpuBusy(false)
    }, 800)
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
    playerAction((g) => {
      const { pts, details, isConq } = doWithdraw(g, 0, ck(q, r), t)
      const pd = pts > 0 ? details.join(', ') : '0 pt'
      g.lastAction = `G1 ↩ (${q},${r})${isConq ? ' 🔥' : ''} +${pts}pt (${pd}) tot ${g.scores[0]}`
      if (!g.gameOver) { replenishHand(g, 0); g.phase = 'draw'; g.turn = 1 }
    })
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
    const newGame = makeGame(n)
    dispatch({ type: 'RESET', game: newGame })
    onRestart(n)
    if (newGame.turn !== 0) setTimeout(() => executeCpu(newGame), 800)
  }

  return {
    gs,
    hist,
    dispatch,
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
  }
}
