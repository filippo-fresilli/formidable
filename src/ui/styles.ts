/**
 * Shared inline-style factories used across panel components.
 * These mirror the CSS token scale defined in index.css.
 */
import type React from 'react'

/** Standard panel card: white bg, subtle border, rounded corners */
export const panel: React.CSSProperties = {
  background: 'var(--bg-panel)',
  borderRadius: 'var(--radius-md)',
  border: '0.5px solid var(--border-default)',
  padding: 10,
}

/** Section label (UPPERCASE, muted, small caps) */
export const sectionHeader: React.CSSProperties = {
  fontSize: 'var(--font-sm)',
  fontWeight: 'var(--fw-bold)' as unknown as number,
  color: 'var(--text-secondary)',
  marginBottom: 7,
  textTransform: 'uppercase',
  letterSpacing: '.05em',
}

/** Full-width action button */
export const actionBtn = (bg: string, color = '#fff'): React.CSSProperties => ({
  width: '100%', padding: '9px 0', borderRadius: 'var(--radius-md)', border: 'none',
  background: bg, color, cursor: 'pointer',
  fontSize: 'var(--font-md)', marginBottom: 6,
  fontFamily: 'inherit', fontWeight: 'var(--fw-semibold)' as unknown as number,
})

/** Square/pill navigation button (undo, redo, help, settings) */
export const navBtn = (enabled: boolean): React.CSSProperties => ({
  height: 44, minWidth: 44, padding: '0 14px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-default)',
  background: enabled ? 'var(--bg-nav-enabled)' : 'var(--bg-nav-disabled)',
  color: enabled ? 'var(--text-nav-enabled)' : 'var(--text-nav-disabled)',
  cursor: enabled ? 'pointer' : 'default',
  fontSize: 'var(--font-md)', fontFamily: 'inherit',
  fontWeight: 'var(--fw-semibold)' as unknown as number,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})
