import { useState } from 'react'
import { Wifi, Users, Plus, LogIn } from 'lucide-react'
import type { I18nDict } from '../i18n'
import type { Difficulty } from '../game/ai'
import { ModalShell } from './ModalShell'

interface OnlineModalProps {
  t: I18nDict
  onCreate: (opts: { humans: number; bots: number; difficulty: Difficulty }) => void
  onJoin: (code: string) => void
  onClose: () => void
}

const primaryBtn: React.CSSProperties = {
  width: '100%', padding: 12, borderRadius: 10, border: 'none',
  background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
  fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}

const ghostBtn: React.CSSProperties = {
  width: '100%', padding: 12, borderRadius: 10, cursor: 'pointer',
  border: '1.5px solid var(--border-default)', background: 'var(--bg-panel-alt)',
  color: 'var(--text-secondary)', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}

function Chips<T extends string | number>({ options, value, onChange }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(({ id, label }) => (
        <button key={String(id)} onClick={() => onChange(id)} style={{
          flex: 1, padding: '9px 0', borderRadius: 10,
          border: `2px solid ${value === id ? 'var(--color-primary)' : 'var(--border-default)'}`,
          background: value === id ? 'var(--color-primary-subtle)' : 'var(--bg-panel-alt)',
          color: value === id ? 'var(--color-primary)' : 'var(--text-secondary)',
          cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        }}>{label}</button>
      ))}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
      marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em',
    }}>{children}</div>
  )
}

export function OnlineModal({ t, onCreate, onJoin, onClose }: OnlineModalProps) {
  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu')

  // create config
  const [total, setTotal]   = useState(2)
  const [bots, setBots]     = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const humans = total - bots

  // join config
  const [codeInput, setCodeInput] = useState('')

  const header = (title: string) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
      <h2 style={{ flex: 1, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Wifi size={18} />{title}
      </h2>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 20, color: 'var(--text-faint)', padding: 4, lineHeight: 1,
      }}>✕</button>
    </div>
  )

  if (view === 'menu') {
    return (
      <ModalShell maxWidth={360} padding={28} onClose={onClose} hideCloseButton>
        {header('Gioca Online')}
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
          Crea una partita e condividi il codice, oppure unisciti con un codice ricevuto.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setView('create')} style={primaryBtn}>
            <Plus size={18} />Crea partita
          </button>
          <button onClick={() => setView('join')} style={ghostBtn}>
            <LogIn size={18} />Unisciti con codice
          </button>
        </div>
      </ModalShell>
    )
  }

  if (view === 'create') {
    // When total changes, clamp bots so humans stays ≥ 1.
    const maxBots = total - 1
    const botsClamped = Math.min(bots, maxBots)
    return (
      <ModalShell maxWidth={360} padding={28} onClose={onClose} hideCloseButton>
        {header('Crea partita')}

        <div style={{ marginBottom: 18 }}>
          <Label>Giocatori totali</Label>
          <Chips
            options={[{ id: 2, label: '2' }, { id: 3, label: '3' }, { id: 4, label: '4' }]}
            value={total}
            onChange={(v) => { setTotal(v); if (bots > v - 1) setBots(v - 1) }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <Label>Di cui bot</Label>
          <Chips
            options={Array.from({ length: total }, (_, i) => ({ id: i, label: String(i) }))}
            value={botsClamped}
            onChange={setBots}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={13} />{humans} umani · {botsClamped} bot
          </p>
        </div>

        {botsClamped > 0 && (
          <div style={{ marginBottom: 18 }}>
            <Label>{t.difficulty}</Label>
            <Chips
              options={(['easy', 'medium', 'hard'] as Difficulty[]).map(d => ({ id: d, label: t.diffLabels[d] }))}
              value={difficulty}
              onChange={setDifficulty}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setView('menu')} style={ghostBtn}>Indietro</button>
          <button onClick={() => onCreate({ humans, bots: botsClamped, difficulty })} style={primaryBtn}>
            Crea
          </button>
        </div>
      </ModalShell>
    )
  }

  // join
  const valid = codeInput.trim().length === 4
  return (
    <ModalShell maxWidth={360} padding={28} onClose={onClose} hideCloseButton>
      {header('Unisciti')}
      <Label>Codice stanza</Label>
      <input
        autoFocus
        value={codeInput}
        onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
        onKeyDown={(e) => { if (e.key === 'Enter' && valid) onJoin(codeInput.trim()) }}
        placeholder="ABCD"
        style={{
          width: '100%', padding: '14px 12px', borderRadius: 10, boxSizing: 'border-box',
          border: '2px solid var(--border-default)', background: 'var(--bg-panel-alt)',
          color: 'var(--text-primary)', fontSize: 26, fontWeight: 800, fontFamily: 'inherit',
          textAlign: 'center', letterSpacing: '.3em', outline: 'none', marginBottom: 18,
        }}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setView('menu')} style={ghostBtn}>Indietro</button>
        <button onClick={() => valid && onJoin(codeInput.trim())} disabled={!valid}
          style={{ ...primaryBtn, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>
          Entra
        </button>
      </div>
    </ModalShell>
  )
}
