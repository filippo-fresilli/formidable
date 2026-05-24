import type { I18nDict } from '../i18n'
import { ModalShell } from './ModalShell'

interface WinModalProps {
  winner: string
  score: number
  t: I18nDict
  onRestart: () => void
  onClose: () => void
}

export function WinModal({ winner, score, t, onRestart, onClose }: WinModalProps) {
  return (
    <ModalShell maxWidth={380} padding={40} textAlign="center" onClose={onClose}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{winner}</h2>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28 }}>{score} pt</p>
      <button className="btn-primary" onClick={onRestart} style={{
        width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
        background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
        fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
      }}>{t.restart}</button>
    </ModalShell>
  )
}
