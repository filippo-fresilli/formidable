import { useRef, useState, useEffect } from 'react'
import { COLOR_HEX, COLOR_STROKE, HRAD } from '../game/constants'
import { ck, parseKey, nbrs, sharedTraits, hexPoints, ALL_CELLS } from '../game/logic'
import { OuterShape, InnerShape } from './HexCard'
import { MEEPLE_PATH } from './MeepleIcon'
import type { Board as BoardType, Meeples, Conquered, Card, Pos } from '../game/types'

interface BoardProps {
  board: BoardType
  meeples: Meeples
  conquered: Conquered
  phase: string
  selIdx: number
  hands: Card[][]
  tokens: number[]
  gameOver: boolean
  placedPos: Pos | null
  playerColors: string[]
  onPlace: (q: number, r: number, conquer: boolean) => void
  onWithdraw: (q: number, r: number) => void
}

// Meeple for SVG board context — uses shared path, viewBox 0 0 16 16, centered at (8,8)
function MeepleIcon({ cx, cy, size, fill }: { cx: number; cy: number; size: number; fill: string }) {
  const f = size / 16
  return (
    <g transform={`translate(${cx - 8 * f},${cy - 8 * f}) scale(${f})`}>
      <path d={MEEPLE_PATH} fill={fill} stroke="white" strokeWidth={0.8 / f} style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))' }} />
    </g>
  )
}

export function Board({
  board, meeples, conquered, phase, selIdx, hands, tokens,
  gameOver, placedPos, playerColors, onPlace, onWithdraw,
}: BoardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(400)

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      // Use the smaller dimension so the board stays square inside its container
      setSize(Math.floor(Math.min(width, height || width)))
    })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const SQ3 = Math.sqrt(3)
  const hr = Math.min(size / (2 * HRAD * 1.8 + 1), 60)
  const ox = size / 2, oy = size / 2
  const toPixel = (q: number, r: number) => ({ x: ox + hr * SQ3 * (q + r / 2), y: oy + hr * 1.5 * r })

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--board-bg)',
        borderRadius: 12,
        border: '2px solid var(--board-border)',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <filter id="card-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          {/* Elevation shadow for conquered (stacked) cards */}
          <filter id="card-elevated" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="0" floodColor="var(--stack-shadow)" floodOpacity="1" />
          </filter>
        </defs>
        {/* Pass 1: shadows only — drawn first so cards cover them */}
        {ALL_CELLS.map(({ q, r }) => {
          const k = ck(q, r)
          if (!board[k]) return null
          const { x, y } = toPixel(q, r)
          return (
            <polygon key={`shadow-${k}`}
              points={hexPoints(x, y, hr - 0.5)}
              style={{ fill: '#00000028', stroke: 'none' }}
              filter="url(#card-shadow)" />
          )
        })}

        {/* Pass 2: layer 0 (empty cells) + layer 1 (normal cards) */}
        {ALL_CELLS.map(({ q, r }) => {
          const { x, y } = toPixel(q, r)
          const k = ck(q, r)
          const card = board[k]
          const meep = meeples[k]
          const isConq = !!conquered[k]
          if (isConq) return null   // conquered cards rendered in Pass 3
          const inset = hr * 0.78

          type HlType = 'none' | 'place' | 'conquer' | 'withdraw'
          let hl: HlType = 'none'
          let onClick: (() => void) | null = null

          if (!gameOver && phase === 'place' && selIdx >= 0) {
            const hc = hands[0][selIdx]
            const adj = !card && Object.keys(board).some((k2) => {
              const [q2, r2] = parseKey(k2)
              return nbrs(q2, r2).some((n) => n.q === q && n.r === r)
            })
            const canConq = card && meep === undefined && tokens[0] > 0 && sharedTraits(hc, card) >= 2
            if (adj) { hl = 'place'; onClick = () => onPlace(q, r, false) }
            else if (canConq) { hl = 'conquer'; onClick = () => onPlace(q, r, true) }
          }
          if (!gameOver && (phase === 'withdraw' || phase === 'meeple') && meep === 0) {
            hl = 'withdraw'; onClick = () => onWithdraw(q, r)
          }

          let fill = card ? COLOR_HEX[card.oc] : 'var(--board-empty-fill)'
          let stroke = card ? 'var(--board-card-stroke)' : 'var(--board-empty-stroke)'
          let sw = 0.6
          if (hl === 'place') { fill = 'var(--place-fill)'; stroke = 'var(--place-stroke)'; sw = 2 }
          if (hl === 'conquer') { fill = 'var(--conquer-fill)'; stroke = 'var(--conquer-stroke)'; sw = 2 }
          if (hl === 'withdraw') { fill = 'var(--withdraw-fill)'; stroke = 'var(--withdraw-stroke)'; sw = 2.5 }
          if (placedPos && placedPos.q === q && placedPos.r === r) { stroke = 'var(--place-stroke)'; sw = 2.5 }

          return (
            <g key={k} onClick={onClick ?? undefined} style={{ cursor: onClick ? 'pointer' : 'default' }}>
              <polygon points={hexPoints(x, y, hr - 0.5)} style={{ fill, stroke, strokeWidth: sw }} />
              {card && (
                <>
                  <OuterShape shape={card.os} cx={x} cy={y} inset={inset} fill="white" stroke={COLOR_STROKE[card.oc]} strokeWidth={hr * 0.08} />
                  <InnerShape shape={card.is} cx={x} cy={y} inset={inset} fill={COLOR_HEX[card.ic]} stroke={COLOR_STROKE[card.ic]} strokeWidth={hr * 0.08} />
                </>
              )}
              {meep !== undefined && (
                <MeepleIcon cx={x + hr * 0.44} cy={y - hr * 0.42} size={hr * 0.65} fill={playerColors[meep]} />
              )}
            </g>
          )
        })}

        {/* Pass 3: layer 2 — conquered (stacked) cards, always on top */}
        {ALL_CELLS.map(({ q, r }) => {
          const { x, y } = toPixel(q, r)
          const k = ck(q, r)
          const card = board[k]
          const meep = meeples[k]
          const isConq = !!conquered[k]
          if (!isConq || !card) return null
          const inset = hr * 0.78

          let onClick: (() => void) | null = null
          let hl: 'none' | 'withdraw' = 'none'
          if (!gameOver && (phase === 'withdraw' || phase === 'meeple') && meep === 0) {
            hl = 'withdraw'; onClick = () => onWithdraw(q, r)
          }

          let fill = COLOR_HEX[card.oc]
          let stroke = 'var(--board-card-stroke)'
          let sw = 0.6
          if (hl === 'withdraw') { fill = 'var(--withdraw-fill)'; stroke = 'var(--withdraw-stroke)'; sw = 2.5 }

          return (
            <g key={`conq-${k}`} onClick={onClick ?? undefined} style={{ cursor: onClick ? 'pointer' : 'default' }}
              filter="url(#card-elevated)" transform="translate(0,-4)">
              <polygon points={hexPoints(x, y, hr - 0.5)} style={{ fill, stroke, strokeWidth: sw }} />
              <OuterShape shape={card.os} cx={x} cy={y} inset={inset} fill="white" stroke={COLOR_STROKE[card.oc]} strokeWidth={hr * 0.08} />
              <InnerShape shape={card.is} cx={x} cy={y} inset={inset} fill={COLOR_HEX[card.ic]} stroke={COLOR_STROKE[card.ic]} strokeWidth={hr * 0.08} />
              {meep === undefined && (
                <circle cx={x + hr * 0.4} cy={y - hr * 0.4} r={hr * 0.18} fill="var(--color-danger)" opacity={0.8} />
              )}
              {meep !== undefined && (
                <MeepleIcon cx={x + hr * 0.44} cy={y - hr * 0.42} size={hr * 0.65} fill={playerColors[meep]} />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
