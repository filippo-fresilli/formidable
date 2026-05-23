import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react'
import { I18N, type Lang } from './i18n'
import { makeGame, cloneGame, replenishHand, doWithdraw, ck, parseKey } from './game/logic'
import { runCpuTurn, type Difficulty } from './game/ai'
import { saveGame, loadSave, clearSave, saveSettings, loadSettings, type Theme } from './game/storage'
import { playSound } from './game/sounds'
import { PLAYER_COLORS, PLAYER_COLORS_DARK, COLOR_HEX } from './game/constants'
import type { GameState, HistoryState, HistoryAction } from './game/types'
import { Board } from './components/Board'
import { OnboardingModal } from './components/OnboardingModal'
import { WinModal } from './components/WinModal'
import { ParamsModal } from './components/ParamsModal'
import { MiniHex } from './components/HexCard'
import { MeepleInline } from './components/MeepleIcon'

// ── History reducer ───────────────────────────────────────────────────────────

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

const formatTime = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Load persisted settings and saved game once (lazy initializer) ────────
  const [init] = useState(() => {
    const savedSettings = loadSettings()
    const savedGame    = loadSave()
    const isResume     = savedGame !== null && !savedGame.game.gameOver && savedGame.game.log.length > 0
    return { savedSettings, savedGame, isResume }
  })
  const { savedSettings, savedGame, isResume } = init

  const [lang, setLang] = useState<Lang>(savedSettings?.lang ?? 'it')
  const [theme, setTheme] = useState<Theme>(savedSettings?.theme ?? 'light')
  const [playerName, setPlayerName] = useState(savedSettings?.playerName ?? '')
  const [muted, setMuted] = useState(savedSettings?.muted ?? false)
  const [showOnboarding, setShowOnboarding] = useState(!isResume)
  const [showParams, setShowParams] = useState(false)
  const [showWin, setShowWin] = useState(false)
  const [showResume, setShowResume] = useState(isResume)
  const [paramsIsFirstOpen, setParamsIsFirstOpen] = useState(false)
  const [winner, setWinner] = useState<{ name: string; score: number } | null>(null)
  const [elapsed, setElapsed] = useState(isResume ? (savedGame?.elapsed ?? 0) : 0)
  const [timerActive, setTimerActive] = useState(false)
  const [cpuBusy, setCpuBusy] = useState(false)
  const [numPlayers, setNumPlayers] = useState(savedSettings?.numPlayers ?? 2)
  const [difficulty, setDifficulty] = useState<Difficulty>(savedSettings?.difficulty ?? 'medium')
  const [justSaved, setJustSaved] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cpuRef = useRef(false)
  const langRef = useRef(lang)
  const difficultyRef = useRef(difficulty)
  const mutedRef = useRef(muted)
  // true only for the very first onboarding shown at startup (not when reopened via help button)
  const initialOnboardingRef = useRef(!isResume)
  langRef.current = lang
  difficultyRef.current = difficulty
  mutedRef.current = muted

  const [hist, dispatch] = useReducer(
    historyReducer,
    undefined,
    () => {
      if (isResume && savedGame) {
        return { past: [], present: savedGame.game, future: [] } as HistoryState
      }
      return { past: [], present: makeGame(savedSettings?.numPlayers ?? 2), future: [] } as HistoryState
    }
  )
  const gs = hist.present
  const { board, meeples, conquered, scores, tokens, hands, turn, phase, selIdx, log, placedPos, gameOver, numPlayers: np } = gs
  const t = I18N[lang]
  const PL = [playerName.trim() || t.player1, t.bot1, t.bot2, t.bot3]
  const playerColors = theme === 'dark' ? PLAYER_COLORS_DARK : PLAYER_COLORS

  useEffect(() => {
    if (timerActive && !gameOver) timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    else if (timerRef.current) clearInterval(timerRef.current)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerActive, gameOver])

  useEffect(() => {
    if (gameOver && !showWin) {
      const wi = scores.indexOf(Math.max(...scores))
      setWinner({ name: PL[wi], score: scores[wi] })
      playSound('win', mutedRef.current)
      setTimeout(() => setShowWin(true), 600)
    }
  }, [gameOver]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply theme to <html> element ─────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── Persist settings whenever they change ──────────────────────────────────
  useEffect(() => { saveSettings({ lang, numPlayers, difficulty, theme, playerName, muted }) }, [lang, numPlayers, difficulty, theme, playerName, muted])

  // ── Auto-save game state after every move ───────────────────────────────────
  useEffect(() => {
    if (gs.log.length === 0) return        // don't save a brand-new untouched game
    if (gs.gameOver) { clearSave(); return } // clear save when game ends
    saveGame(gs, elapsed)
    setJustSaved(true)
    const timer = setTimeout(() => setJustSaved(false), 1200)
    return () => clearTimeout(timer)
  }, [gs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── CPU executor ────────────────────────────────────────────────────────────

  const executeCpu = useCallback((baseGame: GameState) => {
    if (cpuRef.current) return
    if (!baseGame || baseGame.turn === 0 || baseGame.gameOver) return
    cpuRef.current = true
    setCpuBusy(true)
    const tLocal = I18N[langRef.current]
    const diff = difficultyRef.current
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
  }, [])

  const initDone = useRef(false)
  useEffect(() => {
    if (!initDone.current) {
      initDone.current = true
      // Don't run CPU on load if onboarding/params will be shown first:
      // the real game starts only when the user presses "Iniziamo!"
      if (gs.turn !== 0 && !gs.gameOver && !initialOnboardingRef.current) executeCpu(gs)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Player actions ──────────────────────────────────────────────────────────

  function playerAction(mutateFn: (g: GameState) => void | false) {
    if (cpuRef.current) return
    const g = cloneGame(gs)
    const result = mutateFn(g)
    if (result === false) return
    if (g.lastAction) { g.log = [...g.log, g.lastAction]; delete g.lastAction }
    dispatch({ type: 'COMMIT', game: g })
    if (g.turn !== 0 && !g.gameOver) executeCpu(g)
  }

  function placeCard(q: number, r: number, conquer: boolean) {
    if (cpuRef.current) return
    setTimerActive(true)
    playSound(conquer ? 'conquer' : 'place', muted)
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
    playSound('meeple', muted)
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
    playSound('withdraw', muted)
    playerAction((g) => {
      const { pts, details, isConq } = doWithdraw(g, 0, ck(q, r), t)
      const pd = pts > 0 ? details.join(', ') : '0 pt'
      g.lastAction = `G1 ↩ (${q},${r})${isConq ? ' 🔥' : ''} +${pts}pt (${pd}) tot ${g.scores[0]}`
      if (!g.gameOver) { replenishHand(g, 0); g.phase = 'draw'; g.turn = 1 }
    })
  }

  function selectCard(i: number) {
    if (cpuRef.current || phase !== 'place') return
    playSound('select', muted)
    const g = cloneGame(gs); g.selIdx = g.selIdx === i ? -1 : i
    dispatch({ type: 'COMMIT', game: g })
  }

  function restart(np2?: number) {
    const n = np2 ?? numPlayers
    setNumPlayers(n)
    clearSave()
    const newGame = makeGame(n)
    dispatch({ type: 'RESET', game: newGame })
    setElapsed(0); setTimerActive(false); setShowWin(false); setShowResume(false)
    cpuRef.current = false; setCpuBusy(false)
    if (newGame.turn !== 0) setTimeout(() => executeCpu(newGame), 800)
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const busy = cpuBusy || cpuRef.current
  const canBack = hist.past.length > 0
  const canFwd = hist.future.length > 0

  const panel: React.CSSProperties = {
    background: 'var(--bg-panel)', borderRadius: 10, border: '0.5px solid var(--border-default)', padding: 10,
  }
  const H3: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 7,
    textTransform: 'uppercase', letterSpacing: '.05em',
  }
  const btnS = (bg: string, color = '#fff'): React.CSSProperties => ({
    width: '100%', padding: '9px 0', borderRadius: 9, border: 'none',
    background: bg, color, cursor: 'pointer', fontSize: 14, marginBottom: 6,
    fontFamily: 'inherit', fontWeight: 600,
  })
  const navS = (enabled: boolean): React.CSSProperties => ({
    height: 44, minWidth: 44, padding: '0 14px', borderRadius: 8,
    border: '1px solid var(--border-default)',
    background: enabled ? 'var(--bg-nav-enabled)' : 'var(--bg-nav-disabled)',
    color: enabled ? 'var(--text-nav-enabled)' : 'var(--text-nav-disabled)',
    cursor: enabled ? 'pointer' : 'default',
    fontSize: 14, fontFamily: 'inherit', fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  // ── Render ──────────────────────────────────────────────────────────────────

  const scores_row = (
    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
      {Array.from({ length: np }, (_, i) => {
        if (i === 0) return null // player 1 shown inside hand_panel
        const isActive = turn === i && !gameOver
        return (
          <div key={i} style={{
            flex: 1, background: 'var(--bg-panel)', borderRadius: 10,
            border: `2px solid ${isActive ? playerColors[i] : playerColors[i] + '33'}`,
            boxShadow: isActive ? `0 0 12px ${playerColors[i]}55` : 'none',
            padding: '8px 10px', textAlign: 'center', transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: playerColors[i], marginBottom: 2 }}>{PL[i]}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: playerColors[i], lineHeight: 1.1 }}>
              {scores[i]}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>/50</span>
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
              {Array.from({ length: tokens[i] + Object.values(meeples).filter((v) => v === i).length }, (_, j) => (
                <MeepleInline key={j} color={playerColors[i]} filled={j < tokens[i]} size={16} />
              ))}
            </div>
            {isActive && !busy && (
              <div style={{
                marginTop: 6, fontSize: 12, fontWeight: 600,
                color: playerColors[i], background: `${playerColors[i]}11`,
                borderRadius: 6, padding: '3px 6px',
              }}>{t.playing}</div>
            )}
          </div>
        )
      })}
    </div>
  )

  const hexSize = isDesktop ? 72 : 48

  const isMyTurn = turn === 0 && !gameOver && !busy
  const myInstr = isMyTurn ? (
    phase === 'place' ? (selIdx >= 0 ? t.clickCell : t.selectCard) :
    phase === 'meeple' ? t.useMeeple :
    phase === 'withdraw' ? t.clickMeeple : null
  ) : null
  const handTitle = t.handOf.replace('{name}', PL[0])

  const hand_panel = (
    <div style={{
      ...panel,
      border: `2px solid ${isMyTurn ? playerColors[0] : playerColors[0] + '33'}`,
      boxShadow: isMyTurn ? `0 0 12px ${playerColors[0]}44` : 'none',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      {/* Header: title + meeples + score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: playerColors[0], flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {handTitle}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: tokens[0] + Object.values(meeples).filter((v) => v === 0).length }, (_, j) => (
              <MeepleInline key={j} color={playerColors[0]} filled={j < tokens[0]} size={14} />
            ))}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: playerColors[0], lineHeight: 1 }}>
            {scores[0]}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>/50</span>
          </div>
        </div>
      </div>

      {/* Instruction when active */}
      {myInstr && (
        <div style={{
          marginBottom: 10, fontSize: 12, fontWeight: 600,
          color: playerColors[0], background: `${playerColors[0]}11`,
          borderRadius: 6, padding: '4px 8px',
        }}>{myInstr}</div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', gap: 8 }}>
        {turn === 0 && !gameOver ? hands[0].map((c, i) => (
          <div key={i} className="btn-card" onClick={() => selectCard(i)} style={{
            flex: 1, borderRadius: 10,
            border: `2px solid ${selIdx === i ? '#1E7FFF' : 'var(--border-default)'}`,
            padding: isDesktop ? '12px 8px' : '10px 8px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: selIdx === i ? 'var(--bg-card-hand-sel)' : 'var(--bg-card-hand)',
            opacity: phase !== 'place' || busy ? 0.4 : 1,
            transition: 'all 0.15s',
          }}>
            <MiniHex card={c} size={hexSize} />
            <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-card-hand)', textAlign: 'center' }}>
              <div><span style={{ color: COLOR_HEX[c.oc] }}>■</span> {t.colorNames[c.oc]} {t.shapeNames[c.os]}</div>
              <div><span style={{ color: COLOR_HEX[c.ic] }}>■</span> {t.colorNames[c.ic]} {t.shapeNames[c.is]}</div>
            </div>
          </div>
        )) : gameOver ? (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.gameEnded}</div>
        ) : (
          <div className="bot-thinking">
            <div className="bot-thinking__dots">
              <span /><span /><span />
            </div>
            {t.botThinking}
          </div>
        )}
      </div>
    </div>
  )

  // ── Meeple action buttons (phase === 'meeple') ───────────────────────────
  function renderMeepleActions() {
    const mine = Object.entries(meeples).filter(([, v]) => v === 0)
    const [singleKey] = mine.length === 1 ? mine[0] : [null]
    const [sq, sr] = singleKey ? parseKey(singleKey) : [0, 0]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {tokens[0] > 0 && placedPos && (
            <button className="btn-primary" onClick={placeMeeple}
              style={{ ...btnS('#1E7FFF'), margin: 0, flex: 1 }}>
              {t.placeMeeple}
            </button>
          )}
          {singleKey && (
            <button className="btn-primary" onClick={() => playerWithdraw(sq, sr)}
              style={{ ...btnS('#e6a800', '#1a1a00'), margin: 0, flex: 1 }}>
              {t.withdrawMeeple}
            </button>
          )}
        </div>
        {mine.length > 1 && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t.clickMeeple}
          </div>
        )}
      </div>
    )
  }

  const actions_panel = (
    <div style={panel}>
      <div style={H3}>{t.actions}</div>
      {!gameOver && !busy && turn === 0 && phase === 'meeple' && (
        <>
          {renderMeepleActions()}
          <button className="btn-ghost" onClick={skipMeeple} style={btnS('#eee', '#555')}>{t.skip}</button>
        </>
      )}
      {turn === 0 && phase === 'place' && !busy && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{t.hint}</div>
      )}
      <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {([['#cce4ff', t.placeable], ['#ffd0c0', t.conquerable], ['var(--withdraw-fill)', t.withdrawable]] as [string, string][]).map(([bg, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: bg, borderRadius: 3, flexShrink: 0 }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const UndoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" /><path d="M3 13C5 7 10 4 16 5.5a9 9 0 0 1 5 7.5" />
    </svg>
  )
  const RedoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" /><path d="M21 13C19 7 14 4 8 5.5A9 9 0 0 0 3 13" />
    </svg>
  )

  const history_panel = (
    <div style={panel} className="history-panel">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: H3.marginBottom }}>
        <div style={{ ...H3, marginBottom: 0, flex: 1 }}>{t.history}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-nav" style={navS(canBack)} onClick={() => { playSound('undo', muted); dispatch({ type: 'UNDO' }) }} disabled={!canBack || busy} title="Undo"><UndoIcon /></button>
          <button className="btn-nav" style={navS(canFwd)} onClick={() => dispatch({ type: 'REDO' })} disabled={!canFwd || busy} title="Redo"><RedoIcon /></button>
        </div>
      </div>
      <div className="history-log">
        {log.length === 0 && <div style={{ color: 'var(--text-faint)' }}>—</div>}
        {log.map((entry, i) => (
          <div key={i} style={{
            borderRadius: 4, padding: '1px 4px',
            background: i === log.length - 1 ? 'var(--bg-history-highlight)' : 'transparent',
            fontWeight: i === log.length - 1 ? 600 : 400,
          }}>
            {i + 1}. {entry}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="app-root">
      {showResume && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
        }}>
          <div style={{
            background: 'var(--bg-panel)', borderRadius: 16, padding: 32, maxWidth: 360, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💾</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              {t.resumeTitle}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              {t.resumeTurn} {gs.log.length} · {gs.scores.join(' – ')} pt
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={() => { setShowResume(false); setTimerActive(true) }} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                background: '#1E7FFF', color: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              }}>
                {t.resume}
              </button>
              <button className="btn-ghost" onClick={() => { setShowResume(false); restart() }} style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                border: '1px solid var(--border-default)', background: 'var(--bg-panel-alt)',
                color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
              }}>
                {t.newGame}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && <OnboardingModal t={t} onClose={() => {
        setShowOnboarding(false)
        if (initialOnboardingRef.current) {
          initialOnboardingRef.current = false
          setParamsIsFirstOpen(true)
          setShowParams(true)
        }
      }} />}
      {showParams && (
        <ParamsModal t={t} lang={lang} setLang={setLang} numPlayers={numPlayers}
          onSetPlayers={(n) => { setNumPlayers(n); if (!paramsIsFirstOpen) restart(n) }}
          onStart={() => { restart(numPlayers); setShowParams(false); setParamsIsFirstOpen(false) }}
          onRestart={() => restart()}
          difficulty={difficulty} setDifficulty={setDifficulty}
          playerName={playerName} setPlayerName={setPlayerName}
          muted={muted} setMuted={setMuted}
          theme={theme} setTheme={setTheme}
          isFirstOpen={paramsIsFirstOpen}
          onClose={() => { setShowParams(false); setParamsIsFirstOpen(false) }} />
      )}
      {showWin && winner && (
        <WinModal winner={winner.name} score={winner.score} t={t}
          onRestart={() => { setShowWin(false); restart() }} onClose={() => setShowWin(false)} />
      )}

      {/* TOP BAR */}
      <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '.02em' }}>Formidable</span>
        <span style={{
          fontSize: 12, color: '#3DC35A', userSelect: 'none',
          opacity: justSaved ? 1 : 0,
          transition: 'opacity 0.6s',
          pointerEvents: 'none',
        }}>💾</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isDesktop && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--timer-bg)', border: '1px solid var(--timer-border)', borderRadius: 8, padding: '0 12px', height: 44,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: gameOver ? 'var(--timer-color-over)' : 'var(--timer-color)' }}>
                ⏱ {formatTime(elapsed)}
              </span>
              <button className="btn-icon" onClick={() => setTimerActive((a) => !a)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                padding: '0 4px', color: 'var(--text-secondary)', height: 44, display: 'flex', alignItems: 'center',
              }}>{timerActive ? '⏸' : '▶'}</button>
            </div>
          )}
          <button className="btn-nav" onClick={() => { initialOnboardingRef.current = false; setShowOnboarding(true) }} style={navS(true)}>{t.help}</button>
          <button className="btn-nav" onClick={() => setShowParams(true)} style={{ ...navS(true), gap: 4 }}>
            ⚙️{isDesktop && <span> {t.params.replace('⚙️ ', '')}</span>}
          </button>
        </div>
      </div>

      {/* MAIN AREA: two-col on desktop, single col on mobile */}
      <div className="main-area">

        {/* Board column — first in DOM so it appears on top on mobile */}
        <div className="left-col">
          <div className="scores-mobile">{scores_row}</div>
          <div className="board-wrap">
            <Board
              board={board} meeples={meeples} conquered={conquered}
              phase={phase} selIdx={selIdx} hands={hands} tokens={tokens}
              gameOver={gameOver || busy} placedPos={placedPos}
              playerColors={playerColors}
              onPlace={placeCard} onWithdraw={playerWithdraw}
            />
          </div>
        </div>

        {/* Sidebar — second in DOM (below board on mobile, left on desktop via CSS order) */}
        <div className="sidebar">
          <div className="scores-desktop">{scores_row}</div>
          {hand_panel}
          {actions_panel}
          {history_panel}
        </div>

      </div>
    </div>
  )
}
