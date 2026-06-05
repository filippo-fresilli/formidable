import { useState } from 'react'
import type { I18nDict } from '../i18n'
import type { Card } from '../game/types'
import { ModalShell } from './ModalShell'
import { MiniHex } from './HexCard'

// Illustrative visuals for specific steps (reuse the real card renderer).
// Step 1 = "Le carte" (anatomy), Step 3 = "Come fare punti" (a scoring row).
const SAMPLE_CARD: Card = { os: 'Q', oc: 'R', is: 'C', ic: 'B' }
const SCORING_ROW: Card[] = [
  { os: 'T', oc: 'G', is: 'C', ic: 'R' },
  { os: 'Q', oc: 'G', is: 'T', ic: 'B' },
  { os: 'C', oc: 'G', is: 'Q', ic: 'R' },
  { os: 'T', oc: 'G', is: 'C', ic: 'B' },
]

function StepVisual({ step, icon }: { step: number; icon: string }) {
  if (step === 1) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <MiniHex card={SAMPLE_CARD} size={84} />
      </div>
    )
  }
  if (step === 3) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
        {SCORING_ROW.map((c, i) => <MiniHex key={i} card={c} size={48} />)}
        <span style={{
          marginLeft: 8, fontSize: 20, fontWeight: 800, color: '#3DC35A',
          fontVariantNumeric: 'tabular-nums',
        }}>+4</span>
      </div>
    )
  }
  // Other steps: keep the emoji as a playful accent
  return <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
}

export function OnboardingModal({ t, onClose, onStart }: { t: I18nDict; onClose: () => void; onStart?: () => void }) {
  const [step, setStep] = useState(0)
  const steps = t.onboarding
  const { icon, title, text } = steps[step]
  const isLast = step === steps.length - 1
  // Closing the tutorial (X, overlay click, or the close button on step 0) all
  // do the same thing: start the game.
  const finish = onStart ?? onClose

  return (
    <ModalShell maxWidth={480} padding={32} onClose={finish}>
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

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <StepVisual step={step} icon={icon} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>{title}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{text}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-ghost" onClick={() => step > 0 ? setStep((s) => s - 1) : finish()} style={{
          padding: '8px 16px', borderRadius: 8,
          border: '1px solid var(--border-default)',
          background: 'var(--bg-panel-alt)', color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
        }}>{step > 0 ? t.prev : t.close}</button>
        <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>{step + 1}/{steps.length}</span>
        <button className="btn-primary" onClick={() => isLast ? finish() : setStep((s) => s + 1)} style={{
          padding: '8px 20px', borderRadius: 8, border: 'none',
          background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
          fontSize: 14, fontFamily: 'inherit', fontWeight: 600,
        }}>{isLast ? t.startGame : t.next}</button>
      </div>

      {/* Skip the whole tutorial and jump straight into the game */}
      {!isLast && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button onClick={finish} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-faint)', fontSize: 13, fontFamily: 'inherit',
            textDecoration: 'underline', padding: 4,
          }}>{t.skipTutorial}</button>
        </div>
      )}
    </ModalShell>
  )
}
