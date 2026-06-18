import { Languages } from 'lucide-react'
import type { Lang } from '../i18n'
import { ModalShell } from './ModalShell'

interface LangModalProps {
  onPick: (lang: Lang) => void
}

const OPTIONS: { id: Lang; label: string }[] = [
  { id: 'it', label: '🇮🇹 Italiano' },
  { id: 'en', label: '🇬🇧 English' },
  { id: 'fr', label: '🇫🇷 Français' },
]

// First-visit only: choose the language before the tutorial so it shows
// in the player's language. Title is shown in all three to stay neutral.
export function LangModal({ onPick }: LangModalProps) {
  return (
    <ModalShell maxWidth={320} padding={32} textAlign="center">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--color-primary)' }}>
        <Languages size={36} />
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.4 }}>
        Lingua · Language · Langue
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OPTIONS.map(({ id, label }) => (
          <button key={id} onClick={() => onPick(id)} style={{
            width: '100%', padding: 14, borderRadius: 10, cursor: 'pointer',
            border: '1.5px solid var(--border-default)', background: 'var(--bg-panel-alt)',
            color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
          }}>{label}</button>
        ))}
      </div>
    </ModalShell>
  )
}
