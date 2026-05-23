import { useState } from 'react'
import type { I18nDict } from '../i18n'

export function OnboardingModal({ t, onClose, onStart }: { t: I18nDict; onClose: () => void; onStart?: () => void }) {
  const [step, setStep] = useState(0)
  const steps = t.onboarding
  const { icon, title, text } = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative',
      }}>
        <button className="btn-icon" onClick={onClose} style={{
          position: 'absolute', top: 14, right: 16, background: 'none',
          border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-faint)', padding: 4,
        }}>✕</button>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? '#1E7FFF' : 'var(--border-default)',
              cursor: 'pointer', transition: 'all 0.2s',
            }} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>{title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{text}</p>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => step > 0 ? setStep((s) => s - 1) : onClose()} style={{
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-panel-alt)', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
          }}>{step > 0 ? t.prev : t.close}</button>
          <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>{step + 1}/{steps.length}</span>
          <button className="btn-primary" onClick={() => isLast ? (onStart ?? onClose)() : setStep((s) => s + 1)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: '#1E7FFF', color: '#fff', cursor: 'pointer',
            fontSize: 14, fontFamily: 'inherit', fontWeight: 600,
          }}>{isLast ? t.startGame : t.next}</button>
        </div>
      </div>
    </div>
  )
}
