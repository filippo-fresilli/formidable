import React, { useState } from 'react'
import type { I18nDict, Lang } from '../i18n'
import type { Difficulty } from '../game/ai'
import type { Theme } from '../game/storage'
import { loadStats } from '../game/stats'
import { ModalShell } from './ModalShell'

function ToggleGroup<T extends string | number>({
  options, selected, onSelect,
}: { options: { id: T; label: string }[]; selected: T; onSelect: (id: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(({ id, label }) => (
        <button key={String(id)} className="btn-toggle" data-selected={selected === id} onClick={() => onSelect(id)} style={{
          flex: 1, padding: '10px 0', borderRadius: 10,
          border: `2px solid ${selected === id ? 'var(--color-primary)' : 'var(--border-default)'}`,
          background: selected === id ? 'var(--color-primary-subtle)' : 'var(--bg-panel-alt)',
          color: selected === id ? 'var(--color-primary)' : 'var(--text-secondary)',
          cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        }}>{label}</button>
      ))}
    </div>
  )
}

interface ParamsModalProps {
  t: I18nDict
  lang: Lang
  setLang: (l: Lang) => void
  numPlayers: number
  onSetPlayers: (n: number) => void
  difficulty: Difficulty
  setDifficulty: (d: Difficulty) => void
  playerName: string
  setPlayerName: (name: string) => void
  muted: boolean
  setMuted: (m: boolean) => void
  theme: Theme
  setTheme: (th: Theme) => void
  isFirstOpen?: boolean
  onStart?: () => void
  onRestart: () => void
  onClose: () => void
}

// ── Stats view ─────────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '.06em',
      marginTop: 18, marginBottom: 6,
    }}>{label}</div>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid var(--border-default)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function StatsView({ t, onBack, onClose }: { t: I18nDict; onBack: () => void; onClose: () => void }) {
  const s = loadStats()
  const hasData = s.gamesPlayed > 0

  const avgTurns      = hasData ? Math.round(s.totalTurns / s.gamesPlayed) : '—'
  const avgTotalScore = hasData ? (s.totalScore / s.gamesPlayed).toFixed(1) : '—'
  const winRate       = hasData ? `${Math.round((s.gamesWon / s.gamesPlayed) * 100)}%` : '—'
  const avgScore      = hasData ? (s.totalScore / s.gamesPlayed).toFixed(1) : '—'

  return (
    <ModalShell maxWidth={360} padding={28} onClose={undefined}>
      {/* Custom header: ← | title | ✕ */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: 'var(--text-faint)', padding: '4px 8px 4px 0', lineHeight: 1,
        }}>←</button>
        <h2 style={{ flex: 1, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {t.statsTitle}
        </h2>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: 'var(--text-faint)', padding: 4, lineHeight: 1,
        }}>✕</button>
      </div>

      {!hasData ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '32px 0' }}>
          {t.statsNoData}
        </p>
      ) : (
        <>
          {/* ── Statistiche del gioco ── */}
          <SectionHeader label={t.statsGameSection} />
          <StatRow label={t.statsGamesPlayed} value={s.gamesPlayed} />
          <StatRow label={t.statsAvgTurns} value={avgTurns} />
          <StatRow label={t.statsAvgTotalScore} value={avgTotalScore} />

          {/* ── Statistiche del giocatore ── */}
          <SectionHeader label={t.statsPlayerSection} />
          <StatRow label={t.statsGamesWon} value={s.gamesWon} />
          <StatRow label={t.statsWinRate} value={winRate} />
          <StatRow label={t.statsBestScore} value={s.bestScore} />
          <StatRow label={t.statsAvgScore} value={avgScore} />
          <StatRow label={t.statsFastestWin} value={s.fastestWin !== null ? `${s.fastestWin} turni` : '—'} />
        </>
      )}
    </ModalShell>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export function ParamsModal({
  t, lang, setLang, numPlayers, onSetPlayers,
  difficulty, setDifficulty, playerName, setPlayerName,
  muted, setMuted, theme, setTheme,
  isFirstOpen = false, onStart, onRestart, onClose,
}: ParamsModalProps) {
  const [view, setView] = useState<'settings' | 'stats'>('settings')

  if (view === 'stats') {
    return <StatsView t={t} onBack={() => setView('settings')} onClose={onClose} />
  }

  const sec = (label: string, child: React.ReactNode) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em',
      }}>{label}</div>
      {child}
    </div>
  )

  return (
    <ModalShell maxWidth={360} padding={28} onClose={isFirstOpen ? undefined : onClose}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20, paddingRight: 32 }}>{t.params}</h2>
      {sec(t.playerNameLabel, (
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={24}
          placeholder={t.playerNamePlaceholder}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
            border: '2px solid var(--border-default)', background: 'var(--bg-panel-alt)',
            color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
            outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
        />
      ))}
      {sec(t.language, (
        <ToggleGroup
          options={[{ id: 'it' as Lang, label: '🇮🇹 Italiano' }, { id: 'en' as Lang, label: '🇬🇧 English' }, { id: 'fr' as Lang, label: '🇫🇷 Français' }]}
          selected={lang} onSelect={setLang}
        />
      ))}
      {sec(t.opponents, (
        <ToggleGroup
          options={[{ id: 2, label: '1 🤖' }, { id: 3, label: '2 🤖' }, { id: 4, label: '3 🤖' }]}
          selected={numPlayers} onSelect={onSetPlayers}
        />
      ))}
      {sec(t.difficulty, (
        <ToggleGroup
          options={(['easy', 'medium', 'hard'] as Difficulty[]).map(d => ({ id: d, label: t.diffLabels[d] }))}
          selected={difficulty} onSelect={setDifficulty}
        />
      ))}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button onClick={() => setMuted(!muted)} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
          border: `2px solid ${muted ? 'var(--border-default)' : 'var(--color-primary)'}`,
          background: muted ? 'var(--bg-panel-alt)' : 'var(--color-primary-subtle)',
          color: muted ? 'var(--text-secondary)' : 'var(--color-primary)',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        }}>{muted ? t.soundOff : t.soundOn}</button>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
          border: '2px solid var(--border-default)',
          background: 'var(--bg-panel-alt)',
          color: 'var(--text-secondary)',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        }}>{theme === 'dark' ? t.themeLight : t.themeDark}</button>
      </div>

      {/* Primary action: changes based on context */}
      {isFirstOpen ? (
        <button className="btn-primary" onClick={onStart} style={{
          width: '100%', padding: 12, borderRadius: 10, border: 'none',
          background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit', marginBottom: 10,
        }}>{t.letsGo}</button>
      ) : (
        <button className="btn-primary" onClick={() => { onRestart(); onClose() }} style={{
          width: '100%', padding: 10, borderRadius: 10, border: 'none',
          background: 'var(--color-accent)', color: '#fff', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit', marginBottom: 10,
        }}>{t.restart}</button>
      )}

      {/* Tertiary stats button — always visible */}
      <button onClick={() => setView('stats')} style={{
        width: '100%', padding: 9, borderRadius: 10, cursor: 'pointer',
        border: '1.5px solid var(--border-default)', background: 'none',
        color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
      }}>{t.statsLabel}</button>

      <p style={{
        margin: '16px 0 0', fontSize: 11, color: 'var(--text-faint)',
        textAlign: 'center', lineHeight: 1.5,
      }}>{t.credits}</p>
    </ModalShell>
  )
}
