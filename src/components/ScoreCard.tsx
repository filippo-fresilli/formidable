import { MeepleInline } from './MeepleIcon'

interface ScoreCardProps {
  name: string
  color: string
  /** Total meeple slots: tokens in hand + meeples on board */
  meepleTotal: number
  /** How many are still in hand (rendered filled) */
  meeplesFilled: number
  score: number
  isActive: boolean
}

export function ScoreCard({ name, color, meepleTotal, meeplesFilled, score, isActive }: ScoreCardProps) {
  return (
    <div style={{
      background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)',
      border: `2px solid ${isActive ? color : color + '33'}`,
      boxShadow: isActive ? `0 0 12px ${color}55` : 'none',
      padding: '8px 12px', transition: 'all 0.3s',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {/* Left: name + meeples */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'var(--font-base)', fontWeight: 'var(--fw-bold)' as unknown as number,
          color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {Array.from({ length: meepleTotal }, (_, j) => (
            <MeepleInline key={j} color={color} filled={j < meeplesFilled} size={14} />
          ))}
        </div>
      </div>
      {/* Right: score */}
      <div style={{
        fontSize: 'var(--font-3xl)', fontWeight: 'var(--fw-extrabold)' as unknown as number,
        color, lineHeight: 1, flexShrink: 0,
      }}>
        {score}<span style={{ fontSize: 'var(--font-xs)', fontWeight: 'var(--fw-normal)' as unknown as number, color: 'var(--text-muted)' }}>/50</span>
      </div>
    </div>
  )
}
