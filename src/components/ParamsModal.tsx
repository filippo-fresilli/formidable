import React from 'react'
import type { I18nDict, Lang } from '../i18n'
import type { Difficulty } from '../game/ai'
import type { Theme } from '../game/storage'

function ToggleGroup<T extends string | number>({
  options, selected, onSelect,
}: { options: { id: T; label: string }[]; selected: T; onSelect: (id: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(({ id, label }) => (
        <button key={String(id)} className="btn-toggle" data-selected={selected === id} onClick={() => onSelect(id)} style={{
          flex: 1, padding: '10px 0', borderRadius: 10,
          border: `2px solid ${selected === id ? '#1E7FFF' : 'var(--border-default)'}`,
          background: selected === id ? '#1E7FFF22' : 'var(--bg-panel-alt)',
          color: selected === id ? '#1E7FFF' : 'var(--text-secondary)',
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

export function ParamsModal({
  t, lang, setLang, numPlayers, onSetPlayers,
  difficulty, setDifficulty, playerName, setPlayerName,
  muted, setMuted, theme, setTheme,
  isFirstOpen = false, onStart, onRestart, onClose,
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>{t.params}</h2>
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
            onFocus={(e) => { e.currentTarget.style.borderColor = '#1E7FFF' }}
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
            border: `2px solid ${muted ? 'var(--border-default)' : '#1E7FFF'}`,
            background: muted ? 'var(--bg-panel-alt)' : '#1E7FFF22',
            color: muted ? 'var(--text-secondary)' : '#1E7FFF',
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
        {isFirstOpen ? (
          <button className="btn-primary" onClick={onStart} style={{
            width: '100%', padding: 12, borderRadius: 10, border: 'none',
            background: '#1E7FFF', color: '#fff', cursor: 'pointer',
            fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          }}>{t.letsGo}</button>
        ) : (
          <>
            <button className="btn-primary" onClick={() => { onRestart(); onClose() }} style={{
              width: '100%', padding: 10, borderRadius: 10, border: 'none',
              background: '#FF6B35', color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit', marginBottom: 10,
            }}>{t.restart}</button>
            <button className="btn-ghost" onClick={onClose} style={{
              width: '100%', padding: 10, borderRadius: 10,
              border: '1px solid var(--border-default)', background: 'var(--bg-panel-alt)',
              color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
            }}>{t.close}</button>
          </>
        )}
        <p style={{
          margin: '16px 0 0', fontSize: 11, color: 'var(--text-faint)',
          textAlign: 'center', lineHeight: 1.5,
        }}>{t.credits}</p>
      </div>
    </div>
  )
}
