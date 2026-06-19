import { MeepleInline } from './MeepleIcon'
import { useCountUp } from '../ui/useCountUp'

interface PlayerChipProps {
  name: string
  color: string
  /** Total meeple slots: tokens in hand + meeples on board */
  meepleTotal: number
  /** How many are still in hand (rendered filled) */
  meeplesFilled: number
  score: number
  isActive: boolean
}

// Compact version of ScoreCard for the board corners (desktop). Same colours
// and active-turn highlight, just denser: name · meeples · score on one line.
export function PlayerChip({ name, color, meepleTotal, meeplesFilled, score, isActive }: PlayerChipProps) {
  const shownScore = useCountUp(score)
  return (
    <div style={{
      height: 44, minWidth: 142, boxSizing: 'border-box',
      background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)',
      border: `2px solid ${isActive ? color : color + '33'}`,
      boxShadow: isActive ? `0 0 12px ${color}55` : 'none',
      padding: '0 12px', transition: 'all 0.3s',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Left group: name + meeples */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'var(--font-base)', fontWeight: 700, color,
          maxWidth: 84, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {Array.from({ length: meepleTotal }, (_, j) => (
            <MeepleInline key={j} color={color} filled={j < meeplesFilled} size={13} />
          ))}
        </div>
      </div>
      {/* Right: score with /50 like the full card */}
      <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color, lineHeight: 1, flexShrink: 0 }}>
        {shownScore}<span style={{ fontSize: 'var(--font-xs)', fontWeight: 400, color: 'var(--text-muted)' }}>/50</span>
      </div>
    </div>
  )
}
