import type { I18nDict } from '../i18n'

interface WinModalProps {
  winner: string
  score: number
  t: I18nDict
  onRestart: () => void
  onClose: () => void
}

export function WinModal({ winner, score, t, onRestart, onClose }: WinModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 16, padding: 40, maxWidth: 380, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative', textAlign: 'center',
      }}>
        <button className="btn-icon" onClick={onClose} style={{
          position: 'absolute', top: 14, right: 16, background: 'none',
          border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-faint)', padding: 4,
        }}>✕</button>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{winner}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28 }}>{score} pt</p>
        <button className="btn-primary" onClick={onRestart} style={{
          width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
          background: '#1E7FFF', color: '#fff', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        }}>{t.restart}</button>
      </div>
    </div>
  )
}
