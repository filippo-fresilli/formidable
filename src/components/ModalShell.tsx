import React from 'react'

interface ModalShellProps {
  children: React.ReactNode
  maxWidth?: number
  padding?: number
  textAlign?: 'center' | 'left'
  /** When provided, closes on overlay click (and renders ✕ unless hideCloseButton is true) */
  onClose?: () => void
  /** Suppress the built-in ✕ button (overlay-click still works) */
  hideCloseButton?: boolean
  /** Position of the ✕ button (default 'right') */
  closeAlign?: 'left' | 'right'
}

/**
 * Shared modal wrapper: full-screen dark overlay + centred card.
 * Clicking the overlay (outside the card) calls onClose when provided.
 */
export function ModalShell({
  children, maxWidth = 400, padding = 32, textAlign, onClose, hideCloseButton = false, closeAlign = 'right',
}: ModalShellProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
      }}
    >
      {/* Stop propagation so clicks inside the card don't close the modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-panel)', borderRadius: 16, padding, maxWidth, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative',
          ...(textAlign ? { textAlign } : {}),
        }}
      >
        {onClose && !hideCloseButton && (
          <button className="btn-icon" onClick={onClose} style={{
            position: 'absolute', top: 14,
            ...(closeAlign === 'left' ? { left: 16 } : { right: 16 }),
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--text-faint)', padding: 4,
          }}>✕</button>
        )}
        {children}
      </div>
    </div>
  )
}
