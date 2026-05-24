import { panel } from '../ui/styles'
import { MiniHex } from './HexCard'
import { MeepleInline } from './MeepleIcon'
import { COLOR_HEX } from '../game/constants'
import type { I18nDict } from '../i18n'
import type { Card } from '../game/types'

interface HandPanelProps {
  isMyTurn: boolean
  handTitle: string
  playerColor: string
  /** Total meeple slots (in hand + on board) */
  meepleTotal: number
  /** Meeples still in hand (rendered filled) */
  meeplesFilled: number
  score: number
  hands: Card[][]
  turn: number
  gameOver: boolean
  busy: boolean
  phase: string
  selIdx: number
  /** Contextual instruction shown when it's the player's turn */
  myInstr: string | null
  isDesktop: boolean
  t: I18nDict
  onSelectCard: (i: number) => void
}

export function HandPanel({
  isMyTurn, handTitle, playerColor, meepleTotal, meeplesFilled, score,
  hands, turn, gameOver, busy, phase, selIdx, myInstr, isDesktop, t, onSelectCard,
}: HandPanelProps) {
  const hexSize = isDesktop ? 72 : 48

  return (
    <div style={{
      ...panel,
      border: `2px solid ${isMyTurn ? playerColor : playerColor + '33'}`,
      boxShadow: isMyTurn ? `0 0 12px ${playerColor}44` : 'none',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      {/* Header: name + meeples (left) | score (right) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--font-base)', fontWeight: 700,
            color: playerColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {handTitle}
          </div>
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {Array.from({ length: meepleTotal }, (_, j) => (
              <MeepleInline key={j} color={playerColor} filled={j < meeplesFilled} size={14} />
            ))}
          </div>
        </div>
        <div style={{
          fontSize: 'var(--font-3xl)', fontWeight: 800,
          color: playerColor, lineHeight: 1, flexShrink: 0,
        }}>
          {score}<span style={{ fontSize: 'var(--font-xs)', fontWeight: 400, color: 'var(--text-muted)' }}>/50</span>
        </div>
      </div>

      {/* Contextual instruction */}
      {myInstr && (
        <div style={{ marginBottom: 10, fontSize: 'var(--font-sm)', fontStyle: 'italic', color: playerColor }}>
          {myInstr}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', gap: 8 }}>
        {turn === 0 && !gameOver ? hands[0].map((c, i) => (
          <div key={i} className="btn-card" onClick={() => onSelectCard(i)} style={{
            flex: 1, borderRadius: 'var(--radius-md)',
            border: `2px solid ${selIdx === i ? 'var(--color-primary)' : 'var(--border-default)'}`,
            padding: isDesktop ? '12px 8px' : '10px 8px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: selIdx === i ? 'var(--bg-card-hand-sel)' : 'var(--bg-card-hand)',
            opacity: phase !== 'place' || busy ? 0.4 : 1,
            transition: 'all 0.15s',
          }}>
            <MiniHex card={c} size={hexSize} />
            <div style={{ fontSize: 'var(--font-sm)', lineHeight: 1.7, color: 'var(--text-card-hand)', textAlign: 'center' }}>
              <div><span style={{ color: COLOR_HEX[c.oc] }}>■</span> {t.colorNames[c.oc]} {t.shapeNames[c.os]}</div>
              <div><span style={{ color: COLOR_HEX[c.ic] }}>■</span> {t.colorNames[c.ic]} {t.shapeNames[c.is]}</div>
            </div>
          </div>
        )) : gameOver ? (
          <div style={{ fontSize: 'var(--font-base)', color: 'var(--text-secondary)' }}>{t.gameEnded}</div>
        ) : (
          <div className="bot-thinking">
            <div className="bot-thinking__dots"><span /><span /><span /></div>
            {t.botThinking}
          </div>
        )}
      </div>
    </div>
  )
}
