import { useState } from 'react'
import type { I18nDict } from '../i18n'
import { ModalShell } from './ModalShell'

export function OnboardingModal({ t, onClose, onStart }: { t: I18nDict; onClose: () => void; onStart?: () => void }) {
  const [step, setStep] = useState(0)
  const steps = t.onboarding
  const { icon, title, text } = steps[step]
  const isLast = step === steps.length - 1

  return (
    <ModalShell maxWidth={480} padding={32} onClose={onClose}>
      {/* Dot pagination */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
        {steps.map((_, i) => (
          <div key={i} onClick={() => setStep(i)} style={{
            width: i === step ? 24 : 8, height: 8, borderRadius: 4,
            background: i === step ? 'var(--color-primary)' : 'var(--border-default)',
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
          background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
          fontSize: 14, fontFamily: 'inherit', fontWeight: 600,
        }}>{isLast ? t.startGame : t.next}</button>
      </div>
    </ModalShell>
  )
}
