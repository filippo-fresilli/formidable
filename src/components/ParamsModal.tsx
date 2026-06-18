import React from 'react'
import { Volume2, VolumeX, Sun, Moon, RotateCcw, MessageSquare, CalendarDays, Flame, Wifi } from 'lucide-react'
import type { I18nDict, Lang } from '../i18n'
import type { Difficulty } from '../game/ai'
import type { Theme } from '../game/storage'
import { dayNumber, currentStreak, hasPlayedToday, loadDaily } from '../game/daily'
import { ModalShell } from './ModalShell'

const feedbackBtn: React.CSSProperties = {
  width: '100%', padding: 9, borderRadius: 10, cursor: 'pointer', boxSizing: 'border-box',
  border: '1.5px solid var(--border-default)', background: 'none',
  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  textDecoration: 'none', whiteSpace: 'nowrap',
}

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
  onStartDaily: () => void
  onStartOnline: () => void
  onRestart: () => void
  onClose: () => void
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export function ParamsModal({
  t, lang, setLang, numPlayers, onSetPlayers,
  difficulty, setDifficulty, playerName, setPlayerName,
  muted, setMuted, theme, setTheme,
  isFirstOpen = false, onStart, onStartDaily, onStartOnline, onRestart, onClose,
}: ParamsModalProps) {
  const sec = (label: string, child: React.ReactNode) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em',
      }}>{label}</div>
      {child}
    </div>
  )

  const dDay = dayNumber()
  const dStreak = currentStreak()
  const dPlayed = hasPlayedToday()
  const dLast = loadDaily().last

  return (
    <ModalShell maxWidth={360} padding={28} onClose={isFirstOpen ? undefined : onClose} hideCloseButton>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ flex: 1, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{t.params}</h2>
        {!isFirstOpen && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--text-faint)', padding: 4, lineHeight: 1,
          }}>✕</button>
        )}
      </div>

      {/* Daily challenge */}
      <div style={{
        border: '1.5px solid var(--color-primary)', background: 'var(--color-primary-subtle)',
        borderRadius: 12, padding: 12, marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            <CalendarDays size={16} />{t.dailyChallenge} #{dDay}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: dStreak > 0 ? 'var(--color-accent)' : 'var(--text-muted)' }}>
            <Flame size={15} />{dStreak}
          </span>
        </div>
        {dPlayed ? (
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', padding: '8px 0' }}>
            {t.dailyDone}{dLast ? ` · ${dLast.score} pt` : ''}
          </div>
        ) : (
          <button className="btn-primary" onClick={onStartDaily} style={{
            width: '100%', padding: 10, borderRadius: 10, border: 'none',
            background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          }}>{t.dailyPlay}</button>
        )}
      </div>

      {/* Online multiplayer */}
      <div style={{
        border: '1.5px solid var(--border-default)', background: 'var(--bg-panel-alt)',
        borderRadius: 12, padding: 12, marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          <Wifi size={16} />Gioca Online
        </div>
        <button className="btn-primary" onClick={onStartOnline} style={{
          width: '100%', padding: 10, borderRadius: 10, border: 'none',
          background: 'var(--text-secondary)', color: '#fff', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        }}>Crea o unisciti</button>
      </div>

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
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}{muted ? t.soundOff : t.soundOn}</button>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
          border: '2px solid var(--border-default)',
          background: 'var(--bg-panel-alt)',
          color: 'var(--text-secondary)',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}{theme === 'dark' ? t.themeLight : t.themeDark}</button>
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}><RotateCcw size={16} />{t.restart}</button>
      )}

      {/* Feedback link — opens the user's mail client (does not auto-send) */}
      <a
        href={`mailto:filippo.fresilli@gmail.com?subject=${encodeURIComponent('Formidable — Feedback')}`}
        style={feedbackBtn}
      ><MessageSquare size={15} />{t.feedback}</a>

      <p style={{
        margin: '16px 0 0', fontSize: 11, color: 'var(--text-faint)',
        textAlign: 'center', lineHeight: 1.5,
      }}>{t.credits}</p>
    </ModalShell>
  )
}
