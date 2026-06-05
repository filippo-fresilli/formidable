import { useEffect, useRef, useState } from 'react'
import { MeepleInline } from './MeepleIcon'

// Smoothly tween a displayed number toward `value` (easeOutCubic).
function useCountUp(value: number, duration = 550): number {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  useEffect(() => {
    const from = fromRef.current
    if (from === value) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return display
}

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
  const shownScore = useCountUp(score)
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
          fontSize: 'var(--font-base)', fontWeight: 700,
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
        fontSize: 'var(--font-3xl)', fontWeight: 800,
        color, lineHeight: 1, flexShrink: 0,
      }}>
        {shownScore}<span style={{ fontSize: 'var(--font-xs)', fontWeight: 400, color: 'var(--text-muted)' }}>/50</span>
      </div>
    </div>
  )
}
