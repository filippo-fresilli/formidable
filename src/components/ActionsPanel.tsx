import { panel, sectionHeader, actionBtn } from '../ui/styles'
import { parseKey } from '../game/logic'
import type { I18nDict } from '../i18n'
import type { Meeples, Pos } from '../game/types'

interface ActionsPanelProps {
  gameOver: boolean
  busy: boolean
  turn: number
  phase: string
  hasToken: boolean      // tokens[0] > 0
  meeples: Meeples
  placedPos: Pos | null
  t: I18nDict
  onPlaceMeeple: () => void
  onSkipMeeple: () => void
  onWithdraw: (q: number, r: number) => void
}

const LEGEND: [string, string][] = [
  ['var(--place-fill)',   'placeable'],
  ['var(--conquer-fill)', 'conquerable'],
  ['var(--withdraw-fill)', 'withdrawable'],
]

export function ActionsPanel({
  gameOver, busy, turn, phase, hasToken, meeples, placedPos, t,
  onPlaceMeeple, onSkipMeeple, onWithdraw,
}: ActionsPanelProps) {
  const mine = Object.entries(meeples).filter(([, v]) => v === 0)
  const [singleKey] = mine.length === 1 ? mine[0] : [null]
  const [sq, sr] = singleKey ? parseKey(singleKey) : [0, 0]

  const legendLabels: Record<string, string> = {
    placeable: t.placeable,
    conquerable: t.conquerable,
    withdrawable: t.withdrawable,
  }

  return (
    <div style={panel}>
      <div style={sectionHeader}>{t.actions}</div>

      {!gameOver && !busy && turn === 0 && phase === 'meeple' && (
        <>
          {/* Meeple action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {hasToken && placedPos && (
                <button className="btn-primary" onClick={onPlaceMeeple}
                  style={{ ...actionBtn('var(--color-primary)'), margin: 0, flex: 1 }}>
                  {t.placeMeeple}
                </button>
              )}
              {singleKey && (
                <button className="btn-primary" onClick={() => onWithdraw(sq, sr)}
                  style={{ ...actionBtn('var(--color-warning)', '#1a1a00'), margin: 0, flex: 1 }}>
                  {t.withdrawMeeple}
                </button>
              )}
            </div>
            {mine.length > 1 && (
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                {t.clickMeeple}
              </div>
            )}
          </div>
          <button className="btn-ghost" onClick={onSkipMeeple} style={actionBtn('#eee', '#555')}>{t.skip}</button>
        </>
      )}

      {turn === 0 && phase === 'place' && !busy && (
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
          {t.hint}
        </div>
      )}

      {/* Colour legend */}
      <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {LEGEND.map(([bg, key]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: bg, borderRadius: 'var(--radius-xs)', flexShrink: 0 }} />
            <span>{legendLabels[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
