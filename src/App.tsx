import { useState, useEffect, useRef } from 'react'
import { Copy, Check } from 'lucide-react'
import { I18N, type Lang } from './i18n'
import { makeGame } from './game/logic'
import { type Difficulty } from './game/ai'
import { saveGame, loadSave, clearSave, saveSettings, loadSettings, type Theme } from './game/storage'
import { recordGameResult } from './game/stats'
import { recordDailyResult, dayNumber } from './game/daily'
import { trackGameStarted, trackGameCompleted, trackPwaInstalled } from './game/analytics'
import { playSound } from './game/sounds'
import { PLAYER_COLORS, PLAYER_COLORS_DARK } from './game/constants'
import type { HistoryState } from './game/types'
import { useGame } from './game/useGame'
import { useOnlineGame } from './game/useOnlineGame'
import { useMediaQuery } from './ui/useMediaQuery'
import { Board } from './components/Board'
import { OnboardingModal } from './components/OnboardingModal'
import { WinModal } from './components/WinModal'
import { ParamsModal } from './components/ParamsModal'
import { StatsModal } from './components/StatsModal'
import { OnlineModal } from './components/OnlineModal'
import { PlayModal } from './components/PlayModal'
import { ModalShell } from './components/ModalShell'
import { TopBar } from './components/TopBar'
import { ScoreCard } from './components/ScoreCard'
import { HandPanel } from './components/HandPanel'
import { ActionsPanel } from './components/ActionsPanel'
import { HistoryPanel } from './components/HistoryPanel'

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Load persisted settings and saved game once ───────────────────────────
  const [init] = useState(() => {
    const savedSettings = loadSettings()
    const savedGame    = loadSave()
    const isResume     = savedGame !== null && !savedGame.game.gameOver && savedGame.game.log.length > 0
    return { savedSettings, savedGame, isResume }
  })
  const { savedSettings, savedGame, isResume } = init

  // ── Settings state ────────────────────────────────────────────────────────
  const [lang, setLang]             = useState<Lang>(savedSettings?.lang ?? 'it')
  const [theme, setTheme]           = useState<Theme>(savedSettings?.theme ?? 'light')
  const [playerName, setPlayerName] = useState(savedSettings?.playerName ?? '')
  const [muted, setMuted]           = useState(savedSettings?.muted ?? false)
  const [numPlayers, setNumPlayers] = useState(savedSettings?.numPlayers ?? 2)
  const [difficulty, setDifficulty] = useState<Difficulty>(savedSettings?.difficulty ?? 'medium')

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isOnline, setIsOnline]                   = useState(false)
  const [showOnline, setShowOnline]               = useState(false)
  const [codeCopied, setCodeCopied]               = useState(false)
  const onlinePauseRef                            = useRef(false)
  const [showOnboarding, setShowOnboarding]       = useState(!isResume)
  const [showParams, setShowParams]               = useState(false)
  const [showPlay, setShowPlay]                   = useState(false)
  const [showStats, setShowStats]                 = useState(false)
  const [showWin, setShowWin]                     = useState(false)
  const [showResume, setShowResume]               = useState(isResume)
  const [winner, setWinner]                       = useState<{ name: string; score: number } | null>(null)
  const [dailyResult, setDailyResult]             = useState<{ shareText: string; streak: number } | null>(null)
  const [elapsed, setElapsed]                     = useState(isResume ? (savedGame?.elapsed ?? 0) : 0)
  const [timerActive, setTimerActive]             = useState(false)
  const [justSaved, setJustSaved]                 = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // ── Mutable refs (action closures always see latest values) ───────────────
  const langRef              = useRef(lang)
  const difficultyRef        = useRef(difficulty)
  const mutedRef             = useRef(muted)
  const numPlayersRef        = useRef(numPlayers)
  const initialOnboardingRef = useRef(!isResume)  // true only during very first onboarding

  langRef.current       = lang
  difficultyRef.current = difficulty
  mutedRef.current      = muted
  numPlayersRef.current = numPlayers

  // ── Initial game state ────────────────────────────────────────────────────
  const [initialState] = useState<HistoryState>(() => {
    if (isResume && savedGame) return { past: [], present: savedGame.game, future: [] }
    return { past: [], present: makeGame(savedSettings?.numPlayers ?? 2), future: [] }
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Game logic ────────────────────────────────────────────────────────────
  const online = useOnlineGame()
  onlinePauseRef.current = isOnline

  const {
    gs: offlineGs, flash, isDaily, startDaily,
    busy: offlineBusy, canBack, canFwd,
    placeCard: offlinePlaceCard, placeMeeple: offlinePlaceMeeple,
    skipMeeple: offlineSkipMeeple, playerWithdraw: offlineWithdraw,
    selectCard: offlineSelectCard,
    restart: gameRestart, undo, redo,
  } = useGame({
    initialState,
    numPlayersRef,
    mutedRef,
    langRef,
    difficultyRef,
    initialOnboardingRef,
    pauseRef: onlinePauseRef,
    onTimerStart: () => setTimerActive(true),
    onRestart: (n) => {
      setNumPlayers(n)
      setElapsed(0)
      setTimerActive(false)
      setShowWin(false)
      setShowResume(false)
      setDailyResult(null)
    },
  })

  // ── Online / offline mux ─────────────────────────────────────────────────
  // When online, use server state + online actions; offline hook stays idle.
  const gs           = (isOnline && online.gs) ? online.gs : offlineGs
  const busy         = isOnline ? false : offlineBusy
  const placeCard    = isOnline ? online.placeCard    : offlinePlaceCard
  const placeMeeple  = isOnline ? online.placeMeeple  : offlinePlaceMeeple
  const skipMeeple   = isOnline ? online.skipMeeple   : offlineSkipMeeple
  const playerWithdraw = isOnline ? online.playerWithdraw : offlineWithdraw
  const selectCard   = isOnline ? online.selectCard   : offlineSelectCard

  const { board, meeples, conquered, scores, tokens, hands, turn, phase, selIdx, log, placedPos, gameOver, numPlayers: np } = gs
  const t            = I18N[lang]
  // Online opponents are labelled by their transposed slot's real type (human/bot).
  const PL           = isOnline
    ? Array.from({ length: np }, (_, i) => {
        if (i === 0) return playerName.trim() || t.player1
        const serverIdx = (i + (online.playerIdx ?? 0)) % np
        return online.playerTypes?.[serverIdx] === 'bot' ? `Bot ${i}` : `Giocatore ${i + 1}`
      })
    : [playerName.trim() || t.player1, t.bot1, t.bot2, t.bot3]
  const playerColors = theme === 'dark' ? PLAYER_COLORS_DARK : PLAYER_COLORS

  function restart(np2?: number) {
    if (isOnline) { online.restart(); return }
    trackGameStarted({ difficulty, players: np2 ?? numPlayers, lang })
    gameRestart(np2)
  }

  // ── Play menu (Gioca) ──────────────────────────────────────────────────────
  function handleQuickGame() {
    initialOnboardingRef.current = false
    setShowPlay(false)
    if (isOnline) stopOnline()
    restart(numPlayers)
  }

  function handlePlayDaily() {
    initialOnboardingRef.current = false
    setShowPlay(false)
    if (isOnline) stopOnline()
    startDaily()
  }

  function handleOpenOnline() {
    initialOnboardingRef.current = false
    setShowPlay(false)
    setShowOnline(true)
  }

  function handleCreateRoom(opts: { humans: number; bots: number; difficulty: Difficulty }) {
    setShowOnline(false)
    setIsOnline(true)
    online.createRoom(opts)
  }

  function handleJoinRoom(code: string) {
    setShowOnline(false)
    setIsOnline(true)
    online.joinRoom(code)
  }

  function stopOnline() {
    online.disconnect()
    setIsOnline(false)
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  // Analytics: first game of the session (a resumed game is not a "start") + PWA install
  useEffect(() => {
    if (!isResume) trackGameStarted({ difficulty, players: numPlayers, lang })
    const onInstalled = () => trackPwaInstalled()
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (timerActive && !gameOver) timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    else if (timerRef.current) clearInterval(timerRef.current)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerActive, gameOver])

  useEffect(() => {
    if (gameOver && !showWin) {
      const wi = scores.indexOf(Math.max(...scores))
      const won = wi === 0
      setWinner({ name: PL[wi], score: scores[wi] })
      playSound('win', mutedRef.current)
      // Online games don't track a local turn log; keep them out of offline stats.
      if (!isOnline) {
        recordGameResult(scores[0], won, gs.log.length)
        trackGameCompleted({
          won, score: scores[0], turns: gs.log.length,
          difficulty: difficultyRef.current, players: numPlayersRef.current,
        })
      }
      if (isDaily) {
        const dr = recordDailyResult({ won, score: scores[0], turns: gs.log.length, elapsed })
        const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
        const line = t.dailyShareLine
          .replace('{day}', String(dayNumber()))
          .replace('{score}', String(scores[0]))
          .replace('{turns}', String(gs.log.length))
          .replace('{time}', fmt(elapsed))
        const url = `${window.location.origin}${window.location.pathname}`
        setDailyResult({ shareText: `${won ? '🏆' : '💪'} ${line}\n${url}`, streak: dr.streak })
      }
      setTimeout(() => setShowWin(true), 600)
    }
  }, [gameOver]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])

  useEffect(() => {
    saveSettings({ lang, numPlayers, difficulty, theme, playerName, muted })
  }, [lang, numPlayers, difficulty, theme, playerName, muted])

  useEffect(() => {
    if (gs.log.length === 0) return
    if (gs.gameOver) { clearSave(); return }
    saveGame(gs, elapsed)
    setJustSaved(true)
    const timer = setTimeout(() => setJustSaved(false), 1200)
    return () => clearTimeout(timer)
  }, [gs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values for panels ─────────────────────────────────────────────

  const isMyTurn  = turn === 0 && !gameOver && !busy
  const myInstr   = isMyTurn ? (
    phase === 'place'    ? (selIdx >= 0 ? t.clickCell : t.selectCard) :
    phase === 'meeple'   ? t.useMeeple :
    phase === 'withdraw' ? t.clickMeeple : null
  ) : null
  const handTitle = t.handOf.replace('{name}', PL[0])

  const myMeepleTotal  = tokens[0] + Object.values(meeples).filter((v) => v === 0).length

  // ── Scores list (bots only — player 1 lives in HandPanel) ─────────────────
  const scoresRow = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
      {Array.from({ length: np }, (_, i) => {
        if (i === 0) return null
        const isActive     = turn === i && !gameOver
        const total        = tokens[i] + Object.values(meeples).filter((v) => v === i).length
        return (
          <ScoreCard
            key={i}
            name={PL[i]}
            color={playerColors[i]}
            meepleTotal={total}
            meeplesFilled={tokens[i]}
            score={scores[i]}
            isActive={isActive}
          />
        )
      })}
    </div>
  )

  const handPanel = (
    <HandPanel
      isMyTurn={isMyTurn}
      handTitle={handTitle}
      playerColor={playerColors[0]}
      meepleTotal={myMeepleTotal}
      meeplesFilled={tokens[0]}
      score={scores[0]}
      hands={hands}
      turn={turn}
      gameOver={gameOver}
      busy={busy}
      phase={phase}
      selIdx={selIdx}
      myInstr={myInstr}
      isDesktop={isDesktop}
      t={t}
      onSelectCard={selectCard}
    />
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app-root">
      {/* ── Online setup modal (create / join) ──────────────────────────── */}
      {showOnline && (
        <OnlineModal t={t}
          onCreate={handleCreateRoom}
          onJoin={handleJoinRoom}
          onClose={() => setShowOnline(false)}
        />
      )}

      {/* ── Online: lobby / connecting / error overlay ──────────────────── */}
      {isOnline && (online.status === 'lobby' || online.status === 'connecting' || online.status === 'error') && (
        <ModalShell maxWidth={340} padding={36} textAlign="center">
          {online.status === 'error' ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                Ops
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
                {online.errorMsg ?? 'Errore di connessione'}
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🌐</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
                {online.status === 'connecting' ? 'Connessione…' : 'Sala d\'attesa'}
              </h2>
              {online.code && (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Condividi questo codice:
                  </p>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    marginBottom: 16,
                  }}>
                    <span style={{
                      fontSize: 34, fontWeight: 800, letterSpacing: '.25em',
                      color: 'var(--color-primary)', fontFamily: 'monospace',
                    }}>{online.code}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(online.code!).then(() => {
                          setCodeCopied(true)
                          setTimeout(() => setCodeCopied(false), 1500)
                        }).catch(() => {})
                      }}
                      aria-label="Copia codice"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
                        border: '1.5px solid var(--border-default)', background: 'var(--bg-panel-alt)',
                        color: codeCopied ? 'var(--color-primary)' : 'var(--text-secondary)',
                      }}
                    >{codeCopied ? <Check size={18} /> : <Copy size={18} />}</button>
                  </div>
                </>
              )}
              {online.lobby && (
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
                  Giocatori: <strong>{online.lobby.joined}/{online.lobby.joined + online.lobby.needed}</strong>
                  {online.lobby.needed > 0 ? ' — in attesa…' : ''}
                </p>
              )}
            </>
          )}
          <button onClick={stopOnline} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: 'var(--color-accent)', color: '#fff', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          }}>Esci</button>
        </ModalShell>
      )}

      {/* ── Online playing: slim banner ──────────────────────────────────── */}
      {isOnline && online.status === 'playing' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
          background: 'var(--color-primary)', color: '#fff',
          fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 14px',
        }}>
          <span>🌐 Online{online.code ? ` · ${online.code}` : ''} · Giocatore {(online.playerIdx ?? 0) + 1}</span>
          <button onClick={stopOnline} style={{
            background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 5,
            color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 11, fontWeight: 700,
          }}>Esci</button>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}

      {showResume && (
        <ModalShell maxWidth={360} padding={32} textAlign="center">
          <div style={{ fontSize: 48, marginBottom: 12 }}>💾</div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            {t.resumeTitle}
          </h2>
          <p style={{ fontSize: 'var(--font-md)', color: 'var(--text-secondary)', marginBottom: 24 }}>
            {t.resumeTurn} {gs.log.length} · {gs.scores.join(' – ')} pt
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={() => { setShowResume(false); setTimerActive(true) }} style={{
              flex: 1, padding: '11px 0', borderRadius: 'var(--radius-md)', border: 'none',
              background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
              fontSize: 'var(--font-md)', fontWeight: 700, fontFamily: 'inherit',
            }}>
              {t.resume}
            </button>
            <button className="btn-ghost" onClick={() => { setShowResume(false); restart() }} style={{
              flex: 1, padding: '11px 0', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)', background: 'var(--bg-panel-alt)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: 'var(--font-md)', fontFamily: 'inherit',
            }}>
              {t.newGame}
            </button>
          </div>
        </ModalShell>
      )}

      {showOnboarding && (
        <OnboardingModal t={t}
          onClose={() => {
            setShowOnboarding(false)
            // First launch: after the tutorial, show the Play menu to pick a mode.
            if (initialOnboardingRef.current) setShowPlay(true)
          }}
          onStart={() => {
            setShowOnboarding(false)
            if (initialOnboardingRef.current) setShowPlay(true)
          }}
        />
      )}

      {showPlay && (
        <PlayModal t={t} numPlayers={numPlayers}
          onQuickGame={handleQuickGame}
          onDaily={handlePlayDaily}
          onOnline={handleOpenOnline}
          isFirstOpen={initialOnboardingRef.current}
          onClose={() => setShowPlay(false)}
        />
      )}

      {showStats && (
        <StatsModal t={t} onClose={() => setShowStats(false)} />
      )}

      {showParams && (
        <ParamsModal t={t} lang={lang} setLang={setLang} numPlayers={numPlayers}
          onSetPlayers={(n) => setNumPlayers(n)}
          difficulty={difficulty} setDifficulty={setDifficulty}
          playerName={playerName} setPlayerName={setPlayerName}
          muted={muted} setMuted={setMuted}
          theme={theme} setTheme={setTheme}
          onClose={() => setShowParams(false)}
        />
      )}

      {showWin && winner && (
        <WinModal winner={winner.name} score={winner.score} t={t}
          elapsed={elapsed} scores={scores} names={PL}
          dailyShareText={isDaily ? dailyResult?.shareText : undefined}
          dailyStreak={isDaily ? dailyResult?.streak : undefined}
          onRestart={() => { setShowWin(false); restart() }}
          onClose={() => setShowWin(false)}
        />
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <TopBar
        justSaved={justSaved}
        elapsed={elapsed}
        timerActive={timerActive}
        gameOver={gameOver}
        isDesktop={isDesktop}
        t={t}
        onToggleTimer={() => setTimerActive((a) => !a)}
        onOpenPlay={() => setShowPlay(true)}
        onHelp={() => { initialOnboardingRef.current = false; setShowOnboarding(true) }}
        onOpenStats={() => setShowStats(true)}
        onOpenSettings={() => setShowParams(true)}
      />

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="main-area">

        {/* Board column */}
        <div className="left-col">
          <div className="scores-mobile">{scoresRow}</div>
          <div className="hand-mobile">{handPanel}</div>
          <div className="board-wrap">
            <Board
              board={board} meeples={meeples} conquered={conquered}
              phase={phase} selIdx={selIdx} hands={hands} tokens={tokens}
              gameOver={gameOver || busy} placedPos={placedPos}
              playerColors={playerColors} flash={flash}
              onPlace={placeCard} onWithdraw={playerWithdraw}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <div className="scores-desktop">{scoresRow}</div>
          <div className="hand-desktop">{handPanel}</div>
          <ActionsPanel
            gameOver={gameOver}
            busy={busy}
            turn={turn}
            phase={phase}
            hasToken={tokens[0] > 0}
            meeples={meeples}
            placedPos={placedPos}
            t={t}
            onPlaceMeeple={placeMeeple}
            onSkipMeeple={skipMeeple}
            onWithdraw={playerWithdraw}
          />
          <HistoryPanel
            log={log}
            canBack={canBack}
            canFwd={canFwd}
            busy={busy}
            muted={muted}
            label={t.history}
            onUndo={undo}
            onRedo={redo}
          />
        </div>

      </div>
    </div>
  )
}
