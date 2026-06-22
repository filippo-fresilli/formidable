import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { Copy, Check } from 'lucide-react'
import { I18N, type Lang, type I18nDict } from './i18n'
import { makeGame, hexPoints } from './game/logic'
import { type Difficulty } from './game/ai'
import { saveGame, loadSave, clearSave, saveSettings, loadSettings, type Theme } from './game/storage'
import { recordGameResult } from './game/stats'
import { recordDailyResult, dayNumber } from './game/daily'
import { trackGameStarted, trackGameCompleted, trackOnlineRoomCreated, trackOnlineRoomJoined, trackOnlineCompleted, trackPwaInstalled } from './game/analytics'
import { playSound } from './game/sounds'
import { PLAYER_COLORS, PLAYER_COLORS_DARK, COLOR_HEX, COLOR_STROKE } from './game/constants'
import type { HistoryState, Card } from './game/types'
import { useGame } from './game/useGame'
import { useOnlineGame } from './game/useOnlineGame'
import { useMediaQuery } from './ui/useMediaQuery'
import { Board } from './components/Board'
import { MEEPLE_PATH } from './components/MeepleIcon'
import { MiniHex, OuterShape, InnerShape } from './components/HexCard'
import { OnboardingModal } from './components/OnboardingModal'
import { WinModal } from './components/WinModal'
import { ParamsModal } from './components/ParamsModal'
import { StatsModal } from './components/StatsModal'
import { OnlineModal } from './components/OnlineModal'
import { PlayModal } from './components/PlayModal'
import { LangModal } from './components/LangModal'
import { ModalShell } from './components/ModalShell'
import { TopBar } from './components/TopBar'
import { PlayerChip } from './components/PlayerChip'
import { HandPanel } from './components/HandPanel'
import { ActionsPanel } from './components/ActionsPanel'
import { HistoryPanel } from './components/HistoryPanel'

// ── Rules section constants ───────────────────────────────────────────────────
const SAMPLE_CARD: Card = { os: 'Q', oc: 'R', is: 'C', ic: 'B' }
// 4 cards sharing 1 trait (outer color = green) → +4 pt
const SCORING_ROW: Card[] = [
  { os: 'T', oc: 'G', is: 'C', ic: 'R' },
  { os: 'Q', oc: 'G', is: 'T', ic: 'B' },
  { os: 'C', oc: 'G', is: 'Q', ic: 'R' },
  { os: 'T', oc: 'G', is: 'C', ic: 'B' },
]
// 4 cards sharing 2 traits (outer color = green + outer shape = triangle) → +8 pt
const SCORING_ROW_2: Card[] = [
  { os: 'T', oc: 'G', is: 'C', ic: 'R' },
  { os: 'T', oc: 'G', is: 'Q', ic: 'B' },
  { os: 'T', oc: 'G', is: 'C', ic: 'R' },
  { os: 'T', oc: 'G', is: 'Q', ic: 'B' },
]

// Annotated sample card for the "Le carte" step: a leader line from each of the
// four corners, drawn on top of the card so it reaches the trait it names
// (inner shape, inner colour, outer shape) and labels its value, e.g.
// "colore esterno / Rosso".
function CardAnatomy({ t }: { t: I18nDict }) {
  const cx = 190, cy = 150, r = 52, inset = r * 0.78
  const sw = r * 0.05
  const card = SAMPLE_CARD

  type Ann = {
    attr: 'os' | 'oc' | 'is' | 'ic'
    value: string
    valueColor: string | null
    ax: number; ay: number   // anchor point on the card (where the line points)
    lx: number; ly: number   // line endpoint near the label
    tx: number; ty: number   // label centre x, first line baseline
  }
  const anns: Ann[] = [
    // top-left → outer colour (the hexagon background)
    { attr: 'oc', value: t.colorNames[card.oc], valueColor: COLOR_HEX[card.oc],
      ax: cx - 45, ay: cy - 26, lx: 78, ly: 58, tx: 78, ty: 34 },
    // top-right → outer shape (the white shape)
    { attr: 'os', value: t.shapeNames[card.os], valueColor: null,
      ax: cx + 25, ay: cy - 25, lx: 302, ly: 58, tx: 302, ty: 34 },
    // bottom-left → inner shape (the centre symbol)
    { attr: 'is', value: t.shapeNames[card.is], valueColor: null,
      ax: cx - 13, ay: cy, lx: 78, ly: 248, tx: 78, ty: 256 },
    // bottom-right → inner colour (the symbol's fill)
    { attr: 'ic', value: t.colorNames[card.ic], valueColor: COLOR_HEX[card.ic],
      ax: cx + 13, ay: cy, lx: 302, ly: 248, tx: 302, ty: 256 },
  ]

  return (
    <svg viewBox="0 0 380 300" width="100%" style={{ display: 'block', maxWidth: 380 }}>
      {/* the card — same primitives as the real board */}
      <polygon points={hexPoints(cx, cy, r)} fill={COLOR_HEX[card.oc]} stroke={COLOR_STROKE[card.oc]} strokeWidth={sw} />
      <OuterShape shape={card.os} cx={cx} cy={cy} inset={inset} fill="white" stroke={COLOR_STROKE[card.oc]} strokeWidth={sw} />
      <InnerShape shape={card.is} cx={cx} cy={cy} inset={inset} fill={COLOR_HEX[card.ic]} stroke={COLOR_STROKE[card.ic]} strokeWidth={sw} />

      {/* leader lines + anchor dots — drawn ON TOP so they reach into the card */}
      {anns.map((a) => (
        <g key={`g${a.attr}`}>
          <line x1={a.lx} y1={a.ly} x2={a.ax} y2={a.ay} stroke="var(--text-secondary)" strokeWidth={1.5} />
          <circle cx={a.ax} cy={a.ay} r={3.6} fill={a.valueColor ?? '#ffffff'} stroke={a.valueColor ? '#ffffff' : 'var(--text-secondary)'} strokeWidth={1.4} />
        </g>
      ))}

      {/* labels: attribute name + value */}
      {anns.map((a) => (
        <text key={`l${a.attr}`} x={a.tx} y={a.ty} textAnchor="middle" fontFamily="system-ui, sans-serif">
          <tspan x={a.tx} fontSize={12.5} fontWeight={700} fill="var(--text-primary)">{t.attrLabelsFull[a.attr]}</tspan>
          <tspan x={a.tx} dy={16} fontSize={12.5} fontWeight={800} fill={a.valueColor ?? 'var(--text-secondary)'}>{a.value}</tspan>
        </text>
      ))}
    </svg>
  )
}

// "Conquista e brucia" example, drawn with the real board's rendering primitives.
// A play area with 8 cards on two crossing axes — a green colour-line and a
// triangle shape-line — meeting at one unguarded opponent card worth +8.
// The player's matching card slides in, overwrites it (conquest), and a meeple
// is placed in the corner, exactly as in a real game.
//   Phase 0: board shown, intersection highlighted as conquerable (+8).
//   Phase 1: player's card slides over the intersection and stacks.
//   Phase 2: the player's meeple pops onto the conquered card.
function ConquestAnimation() {
  const [phase, setPhase] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>, t3: ReturnType<typeof setTimeout>
    const cycle = () => {
      setPhase(0)
      t1 = setTimeout(() => setPhase(1), 1800)   // card slides in
      t2 = setTimeout(() => setPhase(2), 2450)   // meeple pops
      t3 = setTimeout(cycle, 4500)               // hold, then loop
    }
    cycle()
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const SQ3 = 1.7320508
  const hr = 29
  const ox = 150, oy = 110
  const toXY = (q: number, r: number) => ({ x: ox + hr * SQ3 * (q + r / 2), y: oy + hr * 1.5 * r })

  const inset = hr * 0.78
  const sw = hr * 0.08

  const drawCard = (card: Card, x: number, y: number) => (
    <>
      <polygon points={hexPoints(x, y, hr - 0.5)} style={{ fill: COLOR_HEX[card.oc], stroke: 'var(--board-card-stroke)', strokeWidth: 0.6 }} />
      <OuterShape shape={card.os} cx={x} cy={y} inset={inset} fill="white" stroke={COLOR_STROKE[card.oc]} strokeWidth={sw} />
      <InnerShape shape={card.is} cx={x} cy={y} inset={inset} fill={COLOR_HEX[card.ic]} stroke={COLOR_STROKE[card.ic]} strokeWidth={sw} />
    </>
  )

  const drawMeeple = (x: number, y: number, fill: string) => {
    const size = hr * 0.65, f = size / 16
    return (
      <g transform={`translate(${x + hr * 0.44 - 8 * f}, ${y - hr * 0.42 - 8 * f}) scale(${f})`}>
        <path d={MEEPLE_PATH} fill={fill} stroke="white" strokeWidth={0.8 / f}
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
      </g>
    )
  }

  const ME = PLAYER_COLORS[0], OPP = PLAYER_COLORS[1]

  // 8 cards on two axes. Horizontal axis = all green (oc=G); the (-2,0) red card
  // is extra board context. Vertical axis = all triangles (os=T). They cross at
  // (0,0). Withdrawing a meeple there scores the green-4 + triangle-4 = +8.
  const cards: { q: number; r: number; card: Card; meeple?: string }[] = [
    { q: -2, r: 0, card: { os: 'Q', oc: 'R', is: 'T', ic: 'G' } },
    { q: -1, r: 0, card: { os: 'C', oc: 'G', is: 'Q', ic: 'R' }, meeple: ME },
    { q:  1, r: 0, card: { os: 'Q', oc: 'G', is: 'C', ic: 'B' } },
    { q:  2, r: 0, card: { os: 'C', oc: 'G', is: 'T', ic: 'B' } },
    { q:  0, r: -1, card: { os: 'T', oc: 'B', is: 'C', ic: 'G' } },
    { q:  0, r: 1, card: { os: 'T', oc: 'R', is: 'Q', ic: 'B' } },
    { q:  0, r: 2, card: { os: 'T', oc: 'B', is: 'C', ic: 'R' }, meeple: OPP },
  ]
  // Intersection: opponent's unguarded green triangle (8th card).
  const oppIntersection: Card = { os: 'T', oc: 'G', is: 'Q', ic: 'R' }
  // Player's card: same outer shape + outer colour (2 shared traits → can conquer).
  const myCard: Card = { os: 'T', oc: 'G', is: 'C', ic: 'B' }

  const tgt = toXY(0, 0)
  const startX = 250, startY = 40   // hovering top-right, like a card in hand

  const W = 300, H = 275

  // Empty board cells around the cluster, for "plancia" context.
  const occupied = new Set(cards.map((c) => `${c.q},${c.r}`).concat('0,0'))
  const empties: { x: number; y: number; key: string }[] = []
  for (let q = -3; q <= 3; q++) for (let r = -3; r <= 4; r++) {
    if (occupied.has(`${q},${r}`)) continue
    const { x, y } = toXY(q, r)
    if (x > 18 && x < W - 18 && y > 16 && y < H - 16) empties.push({ x, y, key: `${q},${r}` })
  }

  return (
    <div style={{
      background: 'var(--board-bg)', border: '2px solid var(--board-border)',
      borderRadius: 12, padding: 6, width: '100%', maxWidth: 320,
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        {/* Empty board cells */}
        {empties.map(({ x, y, key }) => (
          <polygon key={`e${key}`} points={hexPoints(x, y, hr - 0.5)}
            style={{ fill: 'var(--board-empty-fill)', stroke: 'var(--board-empty-stroke)', strokeWidth: 0.6 }} />
        ))}

        {/* Soft shadows under placed cards */}
        {cards.map(({ q, r }) => {
          const { x, y } = toXY(q, r)
          return <polygon key={`s${q},${r}`} points={hexPoints(x, y, hr - 0.5)} fill="#00000022" />
        })}

        {/* The 8 static cards (two axes) */}
        {cards.map(({ q, r, card, meeple }) => {
          const { x, y } = toXY(q, r)
          return <g key={`c${q},${r}`}>{drawCard(card, x, y)}{meeple && drawMeeple(x, y, meeple)}</g>
        })}

        {/* Intersection — opponent's unguarded card, highlighted as conquerable */}
        <g>
          <polygon points={hexPoints(tgt.x, tgt.y, hr - 0.5)}
            style={{ fill: 'var(--conquer-fill)', stroke: 'var(--conquer-stroke)', strokeWidth: 2 }} />
          <OuterShape shape={oppIntersection.os} cx={tgt.x} cy={tgt.y} inset={inset} fill="white" stroke={COLOR_STROKE[oppIntersection.oc]} strokeWidth={sw} />
          <InnerShape shape={oppIntersection.is} cx={tgt.x} cy={tgt.y} inset={inset} fill={COLOR_HEX[oppIntersection.ic]} stroke={COLOR_STROKE[oppIntersection.ic]} strokeWidth={sw} />
        </g>

        {/* Player's card — slides in and stacks on top (conquest), then meeple */}
        <g style={{
          transform: phase === 0 ? `translate(${startX - tgt.x}px, ${startY - tgt.y}px)` : 'translate(0px, -4px)',
          transition: phase === 0 ? 'none' : 'transform 0.6s cubic-bezier(0.34,1.3,0.64,1)',
          filter: phase >= 1 ? 'drop-shadow(0 4px 0 var(--stack-shadow))' : 'none',
        }}>
          {drawCard(myCard, tgt.x, tgt.y)}
          <g style={{
            transformBox: 'fill-box', transformOrigin: 'center',
            transform: phase === 2 ? 'scale(1)' : 'scale(0)',
            transition: phase === 2 ? 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          }}>
            {drawMeeple(tgt.x, tgt.y, ME)}
          </g>
        </g>

        {/* +8 score badge on the intersection (same style as the real board) */}
        {(() => {
          const label = '+8'
          const w = hr * (0.42 + 0.24 * label.length)
          const h = hr * 0.5
          const by = tgt.y - hr * 0.98
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={tgt.x - w / 2} y={by - h / 2} width={w} height={h} rx={h / 2}
                fill="#10161f" opacity={0.9} stroke="#fff" strokeWidth={0.7} />
              <text x={tgt.x} y={by} textAnchor="middle" dominantBaseline="central"
                fill="#fff" fontWeight={800} fontSize={hr * 0.4} fontFamily="system-ui, sans-serif">{label}</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

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
  // No stored settings at all → first ever visit: ask for the language first.
  const isFirstVisit = savedSettings === null

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
  const [showLangPicker, setShowLangPicker]       = useState(isFirstVisit)
  const [showOnboarding, setShowOnboarding]       = useState(!isResume && !isFirstVisit)
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
    trackGameStarted({ mode: 'quick', difficulty, players: np2 ?? numPlayers, lang })
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
    trackGameStarted({ mode: 'daily', difficulty: 'medium', players: 2, lang })
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
    trackOnlineRoomCreated({ humans: opts.humans, bots: opts.bots, difficulty: opts.difficulty })
    online.createRoom(opts)
  }

  function handleJoinRoom(code: string) {
    setShowOnline(false)
    setIsOnline(true)
    trackOnlineRoomJoined()
    online.joinRoom(code)
  }

  function stopOnline() {
    online.disconnect()
    setIsOnline(false)
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  // Analytics: PWA install. Game starts are tracked when the player actually
  // picks a mode (quick/daily/online), not on mount — see restart()/handlePlay*.
  useEffect(() => {
    const onInstalled = () => trackPwaInstalled()
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
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
      // Online games don't track a local turn log; keep them out of offline stats,
      // but still record an analytics event so online usage is visible.
      if (isOnline) {
        trackOnlineCompleted({ won, players: numPlayersRef.current })
      } else {
        recordGameResult(scores[0], won, gs.log.length)
        trackGameCompleted({
          mode: isDaily ? 'daily' : 'quick',
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

  // ── Corner chips: all players, one per board corner ───────────────────────
  // Index → corner: 0 (you) bottom-left, 1 top-left, 2 top-right, 3 bottom-right.
  const CORNERS: CSSProperties[] = [
    { bottom: 8, left: 8 },
    { top: 8, left: 8 },
    { top: 8, right: 8 },
    { bottom: 8, right: 8 },
  ]

  // Corner chips: absolute overlay at board corners (mobile + desktop).
  const cornerChips = (
    <div className="corner-chips" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: np }, (_, i) => {
        const isActive = turn === i && !gameOver
        const total    = tokens[i] + Object.values(meeples).filter((v) => v === i).length
        return (
          <div key={i} style={{ position: 'absolute', ...CORNERS[i] }}>
            <PlayerChip
              name={PL[i]}
              color={playerColors[i]}
              meepleTotal={total}
              meeplesFilled={tokens[i]}
              score={scores[i]}
              isActive={isActive}
              compact={!isDesktop}
              align={i === 2 || i === 3 ? 'right' : 'left'}
            />
          </div>
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
    <>
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

      {showLangPicker && (
        <LangModal onPick={(l) => {
          setLang(l)
          setShowLangPicker(false)
          setShowOnboarding(true)
        }} />
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
          onRestart={() => { if (isOnline) stopOnline(); restart(numPlayers) }}
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
          <div className="hand-mobile">{handPanel}</div>
          <div className="board-wrap">
            <Board
              board={board} meeples={meeples} conquered={conquered}
              phase={phase} selIdx={selIdx} hands={hands} tokens={tokens}
              gameOver={gameOver || busy} placedPos={placedPos}
              playerColors={playerColors} flash={flash}
              showBorder={isDesktop}
              onPlace={placeCard} onWithdraw={playerWithdraw}
            />
            {cornerChips}
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
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

    {/* ── Rules section (below the game, reachable by scrolling) ─────────── */}
    <section className="rules-section">
      <div className="rules-section__inner">
        <h2 className="rules-section__title">{t.howToPlayTitle}</h2>
        <div className="rules-steps">
          {t.onboarding.map((step, i) => (
            <div key={i} className={`rules-step${i % 2 === 1 ? ' rules-step--reverse' : ''}`}>
              <div className="rules-step__visual">
                {i === 1 ? (
                  <CardAnatomy t={t} />
                ) : i === 3 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {SCORING_ROW.map((c, j) => <MiniHex key={j} card={c} size={52} />)}
                      <div style={{ marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#3DC35A' }}>+4 pt</span>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)', lineHeight: 1.3 }}>{t.attrLabels.oc}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {SCORING_ROW_2.map((c, j) => <MiniHex key={j} card={c} size={52} />)}
                      <div style={{ marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#3DC35A' }}>+8 pt</span>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)', lineHeight: 1.3 }}>{t.attrLabels.oc}<br />{t.attrLabels.os}</span>
                      </div>
                    </div>
                  </div>
                ) : i === 4 ? (
                  <ConquestAnimation />
                ) : (
                  <span className="rules-step__icon">{step.icon}</span>
                )}
              </div>
              <div className="rules-step__text">
                <div className="rules-step__num">{t.stepLabel} {i + 1}</div>
                <h3 className="rules-step__title">{step.title}</h3>
                <p className="rules-step__body">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="rules-section__credits">{t.credits}</p>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            className="btn-ghost"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              padding: '8px 20px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-panel)', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 'var(--font-sm)', fontFamily: 'inherit',
            }}
          >↑ {lang === 'it' ? 'Torna al gioco' : lang === 'fr' ? 'Retour au jeu' : 'Back to game'}</button>
        </div>
      </div>
    </section>
    </>
  )
}
