import { Settings, HelpCircle, Clock, Play, Pause, Save, BarChart3, Gamepad2 } from 'lucide-react'
import { panel, navBtn } from '../ui/styles'
import type { I18nDict } from '../i18n'

const formatTime = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

interface TopBarProps {
  justSaved: boolean
  elapsed: number
  timerActive: boolean
  gameOver: boolean
  isDesktop: boolean
  t: I18nDict
  onToggleTimer: () => void
  onOpenPlay: () => void
  onHelp: () => void
  onOpenStats: () => void
  onOpenSettings: () => void
}

export function TopBar({
  justSaved, elapsed, timerActive, gameOver, isDesktop, t,
  onToggleTimer, onOpenPlay, onHelp, onOpenStats, onOpenSettings,
}: TopBarProps) {
  return (
    <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '.02em' }}>
        Formidable
      </span>
      <span style={{
        color: '#3DC35A', userSelect: 'none', display: 'flex', alignItems: 'center',
        opacity: justSaved ? 1 : 0,
        transition: 'opacity 0.6s',
        pointerEvents: 'none',
      }}><Save size={15} /></span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {isDesktop && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--timer-bg)', border: '1px solid var(--timer-border)',
            borderRadius: 'var(--radius-sm)', padding: '0 12px', height: 44,
          }}>
            <span style={{
              fontSize: 'var(--font-md)', fontWeight: 700,
              fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 5,
              color: gameOver ? 'var(--timer-color-over)' : 'var(--timer-color)',
            }}>
              <Clock size={15} /> {formatTime(elapsed)}
            </span>
            <button className="btn-icon" onClick={onToggleTimer} aria-label={timerActive ? 'Pause' : 'Play'} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 4px',
              color: 'var(--text-secondary)', height: 44, display: 'flex', alignItems: 'center',
            }}>
              {timerActive ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>
        )}
        <button className="btn-nav" onClick={onOpenPlay} aria-label={t.playTitle} style={{ ...navBtn(true), gap: 6 }}>
          <Gamepad2 size={18} />{isDesktop && <span>{t.playTitle}</span>}
        </button>
        <button className="btn-nav" onClick={onHelp} aria-label={t.params} style={navBtn(true)}>
          <HelpCircle size={18} />
        </button>
        <button className="btn-nav" onClick={onOpenStats} aria-label={t.statsTitle} style={navBtn(true)}>
          <BarChart3 size={18} />
        </button>
        <button className="btn-nav" onClick={onOpenSettings} aria-label={t.params} style={{ ...navBtn(true), gap: 6 }}>
          <Settings size={18} />{isDesktop && <span>{t.params}</span>}
        </button>
      </div>
    </div>
  )
}
