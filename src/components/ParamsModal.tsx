import React from 'react'
import { Volume2, VolumeX, Sun, Moon, MessageSquare } from 'lucide-react'
import type { I18nDict, Lang } from '../i18n'
import type { Difficulty } from '../game/ai'
import type { Theme } from '../game/storage'
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

// Small square icon toggle used in the header for sound / theme.
function IconToggle({ active, onClick, label, children }: {
  active: boolean; onClick: () => void; label: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} aria-label={label} title={label} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 36, height: 36, borderRadius: 9, cursor: 'pointer',
      border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--border-default)'}`,
      background: active ? 'var(--color-primary-subtle)' : 'var(--bg-panel-alt)',
      color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
    }}>{children}</button>
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
  onClose: () => void
}

export function ParamsModal({
  t, lang, setLang, numPlayers, onSetPlayers,
  difficulty, setDifficulty, playerName, setPlayerName,
  muted, setMuted, theme, setTheme, onClose,
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

  return (
    <ModalShell maxWidth={360} padding={28} onClose={onClose} hideCloseButton>
      {/* Header: title · sound · theme · close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <h2 style={{ flex: 1, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{t.params}</h2>
        <IconToggle active={!muted} onClick={() => setMuted(!muted)} label={muted ? t.soundOff : t.soundOn}>
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </IconToggle>
        <IconToggle active={theme === 'dark'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} label={theme === 'dark' ? t.themeLight : t.themeDark}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </IconToggle>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: 'var(--text-faint)', padding: '0 0 0 4px', lineHeight: 1,
        }}>✕</button>
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
          options={[{ id: 'it' as Lang, label: '🇮🇹' }, { id: 'en' as Lang, label: '🇬🇧' }, { id: 'fr' as Lang, label: '🇫🇷' }]}
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

      <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '0 0 14px', lineHeight: 1.4 }}>
        {t.opponentsHint}
      </p>

      {/* Feedback link — opens the user's mail client (does not auto-send) */}
      <a
        href={`mailto:filippo.fresilli@gmail.com?subject=${encodeURIComponent('Formidable — Feedback')}`}
        style={{
          width: '100%', padding: 9, borderRadius: 10, cursor: 'pointer', boxSizing: 'border-box',
          border: '1.5px solid var(--border-default)', background: 'none',
          color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      ><MessageSquare size={15} />{t.feedback}</a>

      <p style={{
        margin: '16px 0 0', fontSize: 11, color: 'var(--text-faint)',
        textAlign: 'center', lineHeight: 1.5,
      }}>{t.credits}</p>
    </ModalShell>
  )
}
