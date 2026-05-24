import React from 'react'

interface ModalShellProps {
  children: React.ReactNode
  maxWidth?: number
  padding?: number
  textAlign?: 'center' | 'left'
  /** When provided, renders an ✕ close button in the top-right corner */
  onClose?: () => void
}

/**
 * Shared modal wrapper: full-screen dark overlay + centred card.
 * All three modals (Onboarding, Params, Win) and the Resume dialog use this.
 */
export function ModalShell({ children, maxWidth = 400, padding = 32, textAlign, onClose }: ModalShellProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 16, padding, maxWidth, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative',
        ...(textAlign ? { textAlign } : {}),
      }}>
        {onClose && (
          <button className="btn-icon" onClick={onClose} style={{
            position: 'absolute', top: 14, right: 16, background: 'none',
            border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-faint)', padding: 4,
          }}>✕</button>
        )}
        {children}
      </div>
    </div>
  )
}
