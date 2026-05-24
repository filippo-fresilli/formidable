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
  onHelp: () => void
  onOpenSettings: () => void
}

export function TopBar({
  justSaved, elapsed, timerActive, gameOver, isDesktop, t,
  onToggleTimer, onHelp, onOpenSettings,
}: TopBarProps) {
  return (
    <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '.02em' }}>
        Formidable
      </span>
      <span style={{
        fontSize: 'var(--font-sm)', color: '#3DC35A', userSelect: 'none',
        opacity: justSaved ? 1 : 0,
        transition: 'opacity 0.6s',
        pointerEvents: 'none',
      }}>💾</span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {isDesktop && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--timer-bg)', border: '1px solid var(--timer-border)',
            borderRadius: 'var(--radius-sm)', padding: '0 12px', height: 44,
          }}>
            <span style={{
              fontSize: 'var(--font-md)', fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: gameOver ? 'var(--timer-color-over)' : 'var(--timer-color)',
            }}>
              ⏱ {formatTime(elapsed)}
            </span>
            <button className="btn-icon" onClick={onToggleTimer} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 'var(--font-md)', padding: '0 4px',
              color: 'var(--text-secondary)', height: 44, display: 'flex', alignItems: 'center',
            }}>
              {timerActive ? '⏸' : '▶'}
            </button>
          </div>
        )}
        <button className="btn-nav" onClick={onHelp} style={navBtn(true)}>
          {t.help}
        </button>
        <button className="btn-nav" onClick={onOpenSettings} style={{ ...navBtn(true), gap: 4 }}>
          ⚙️{isDesktop && <span> {t.params.replace('⚙️ ', '')}</span>}
        </button>
      </div>
    </div>
  )
}
