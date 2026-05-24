import { panel, sectionHeader, navBtn } from '../ui/styles'
import { playSound } from '../game/sounds'

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

interface HistoryPanelProps {
  log: string[]
  canBack: boolean
  canFwd: boolean
  busy: boolean
  muted: boolean
  label: string
  onUndo: () => void
  onRedo: () => void
}

export function HistoryPanel({ log, canBack, canFwd, busy, muted, label, onUndo, onRedo }: HistoryPanelProps) {
  return (
    <div style={panel} className="history-panel">
      {/* Header + undo/redo buttons */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: sectionHeader.marginBottom }}>
        <div style={{ ...sectionHeader, marginBottom: 0, flex: 1 }}>{label}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn-nav"
            style={navBtn(canBack)}
            onClick={() => { playSound('undo', muted); onUndo() }}
            disabled={!canBack || busy}
            title="Undo"
          >
            <UndoIcon />
          </button>
          <button
            className="btn-nav"
            style={navBtn(canFwd)}
            onClick={onRedo}
            disabled={!canFwd || busy}
            title="Redo"
          >
            <RedoIcon />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="history-log">
        {log.length === 0
          ? <div style={{ color: 'var(--text-faint)' }}>—</div>
          : log.map((entry, i) => (
            <div key={i} style={{
              borderRadius: 'var(--radius-xs)', padding: '1px 4px',
              background: i === log.length - 1 ? 'var(--bg-history-highlight)' : 'transparent',
              fontWeight: i === log.length - 1 ? 600 : 400,
            }}>
              {i + 1}. {entry}
            </div>
          ))
        }
      </div>
    </div>
  )
}
