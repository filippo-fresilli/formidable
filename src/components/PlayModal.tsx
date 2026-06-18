import { Gamepad2, CalendarDays, Flame, Wifi, ChevronRight } from 'lucide-react'
import type { I18nDict } from '../i18n'
import { dayNumber, currentStreak, hasPlayedToday, loadDaily } from '../game/daily'
import { ONLINE_ENABLED } from '../game/socket'
import { ModalShell } from './ModalShell'

interface PlayModalProps {
  t: I18nDict
  numPlayers: number
  onQuickGame: () => void
  onDaily: () => void
  onOnline: () => void
  onClose: () => void
  /** First launch hides the close button (the player must pick a mode) */
  isFirstOpen?: boolean
}

// One tappable mode card: icon + title + subtitle, chevron on the right.
function ModeCard({ icon, title, subtitle, accent, onClick, badge }: {
  icon: React.ReactNode
  title: string
  subtitle: string
  accent?: boolean
  onClick: () => void
  badge?: React.ReactNode
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      padding: 14, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
      border: `1.5px solid ${accent ? 'var(--color-primary)' : 'var(--border-default)'}`,
      background: accent ? 'var(--color-primary-subtle)' : 'var(--bg-panel-alt)',
      fontFamily: 'inherit',
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: accent ? 'var(--color-primary)' : 'var(--bg-panel)',
        color: accent ? '#fff' : 'var(--text-secondary)',
      }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          {title}{badge}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</span>
      </span>
      <ChevronRight size={18} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
    </button>
  )
}

export function PlayModal({ t, numPlayers, onQuickGame, onDaily, onOnline, onClose, isFirstOpen = false }: PlayModalProps) {
  const dDay = dayNumber()
  const dStreak = currentStreak()
  const dPlayed = hasPlayedToday()
  const dLast = loadDaily().last
  const bots = numPlayers - 1

  return (
    <ModalShell maxWidth={360} padding={28} onClose={isFirstOpen ? undefined : onClose} hideCloseButton>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ flex: 1, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gamepad2 size={18} />{t.playTitle}
        </h2>
        {!isFirstOpen && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--text-faint)', padding: 4, lineHeight: 1,
          }}>✕</button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ModeCard
          accent
          icon={<Gamepad2 size={20} />}
          title={t.playQuick}
          subtitle={`${bots} ${bots === 1 ? '🤖' : '🤖'} · ${t.playQuickSub}`}
          onClick={onQuickGame}
        />

        <ModeCard
          icon={<CalendarDays size={20} />}
          title={`${t.dailyChallenge} #${dDay}`}
          subtitle={dPlayed ? `${t.dailyDone}${dLast ? ` · ${dLast.score} pt` : ''}` : t.playDailySub}
          onClick={onDaily}
          badge={dStreak > 0 ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
              <Flame size={13} />{dStreak}
            </span>
          ) : undefined}
        />

        {ONLINE_ENABLED && (
          <ModeCard
            icon={<Wifi size={20} />}
            title={t.playOnline}
            subtitle={t.playOnlineSub}
            onClick={onOnline}
          />
        )}
      </div>
    </ModalShell>
  )
}
