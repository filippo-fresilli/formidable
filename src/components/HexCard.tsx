import { COLOR_HEX, COLOR_STROKE } from '../game/constants'
import { hexPoints } from '../game/logic'
import type { Card, Shape } from '../game/types'

interface ShapeProps { shape: Shape; cx: number; cy: number; inset: number; fill: string; stroke?: string; strokeWidth?: number }

export function OuterShape({ shape, cx, cy, inset, fill, stroke = 'none', strokeWidth = 0 }: ShapeProps) {
  const t = inset * 1.13
  if (shape === 'C') return <circle cx={cx} cy={cy} r={inset * 0.80} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
  if (shape === 'Q') { const s = inset * 1.25; return <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} fill={fill} stroke={stroke} strokeWidth={strokeWidth} /> }
  return <polygon points={`${cx},${cy - t * 0.9} ${cx + t * 0.85},${cy + t * 0.55} ${cx - t * 0.85},${cy + t * 0.55}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
}

export function InnerShape({ shape, cx, cy, inset, fill, stroke = 'none', strokeWidth = 0 }: ShapeProps) {
  const ir = inset * 0.35, t = ir
  if (shape === 'C') return <circle cx={cx} cy={cy} r={ir} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
  if (shape === 'Q') { const s = ir * 1.55; return <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} fill={fill} stroke={stroke} strokeWidth={strokeWidth} /> }
  return <polygon points={`${cx},${cy - t * 0.9} ${cx + t * 0.85},${cy + t * 0.55} ${cx - t * 0.85},${cy + t * 0.55}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
}

export function MiniHex({ card, size = 40 }: { card: Card; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 1, inset = r * 0.78
  const sw = size * 0.035
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={hexPoints(cx, cy, r)} fill={COLOR_HEX[card.oc]} />
      <OuterShape shape={card.os} cx={cx} cy={cy} inset={inset} fill="white" stroke={COLOR_STROKE[card.oc]} strokeWidth={sw} />
      <InnerShape shape={card.is} cx={cx} cy={cy} inset={inset} fill={COLOR_HEX[card.ic]} stroke={COLOR_STROKE[card.ic]} strokeWidth={sw} />
    </svg>
  )
}
