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
  /** Smaller variant for the mobile board corners */
  compact?: boolean
  /** Which side the chip lives on — content hugs that edge */
  align?: 'left' | 'right'
}

// Compact player badge for the board corners. Two lines: name + meeples
// on top, score (n/50) below. Content hugs the corner's side.
export function PlayerChip({ name, color, meepleTotal, meeplesFilled, score, isActive, compact = false, align = 'left' }: PlayerChipProps) {
  const shownScore = useCountUp(score)
  const edge = align === 'right' ? 'flex-end' : 'flex-start'
  return (
    <div style={{
      boxSizing: 'border-box',
      background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)',
      border: `2px solid ${isActive ? color : color + '33'}`,
      boxShadow: isActive ? `0 0 12px ${color}55` : 'none',
      padding: compact ? '5px 9px' : '7px 11px', transition: 'all 0.3s',
      display: 'flex', flexDirection: 'column', alignItems: edge, gap: compact ? 2 : 3,
    }}>
      {/* Line 1: name + meeples (always in this order, both sides) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 5 : 7 }}>
        <div style={{
          fontSize: compact ? 'var(--font-sm)' : 'var(--font-base)', fontWeight: 700, color,
          maxWidth: compact ? 76 : 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{ display: 'flex', gap: compact ? 2 : 3, flexShrink: 0 }}>
          {Array.from({ length: meepleTotal }, (_, j) => (
            <MeepleInline key={j} color={color} filled={j < meeplesFilled} size={compact ? 11 : 13} />
          ))}
        </div>
      </div>
      {/* Line 2: score with /50 like the full card */}
      <div style={{ fontSize: compact ? 'var(--font-xl)' : 'var(--font-2xl)', fontWeight: 800, color, lineHeight: 1 }}>
        {shownScore}<span style={{ fontSize: 'var(--font-xs)', fontWeight: 400, color: 'var(--text-muted)' }}>/50</span>
      </div>
    </div>
  )
}
