import { useState } from 'react'
import { RotateCcw, Share2, Check } from 'lucide-react'
import type { I18nDict } from '../i18n'
import { ModalShell } from './ModalShell'

interface WinModalProps {
  winner: string
  score: number
  /** Final elapsed time in seconds */
  elapsed: number
  /** Final scores of every player, by slot */
  scores: number[]
  /** Display names of every player, by slot */
  names: string[]
  /** When set, this is a daily challenge: share this text and show the streak */
  dailyShareText?: string
  dailyStreak?: number
  t: I18nDict
  onRestart: () => void
  onClose: () => void
}

const fmtTime = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

function buildShareText(t: I18nDict, winner: string, score: number, elapsed: number, scores: number[], names: string[]): string {
  const line = t.shareLine
    .replace('{name}', winner)
    .replace('{score}', String(score))
    .replace('{time}', fmtTime(elapsed))
  // Opponents' scores (everyone except the winner), highest first
  const others = names
    .map((n, i) => ({ n, s: scores[i] }))
    .filter(({ n }) => n !== winner)
    .sort((a, b) => b.s - a.s)
    .map(({ n, s }) => `${n}: ${s}`)
    .join(' · ')
  const url = `${window.location.origin}${window.location.pathname}`
  return `🏆 Formidable\n${line}\n${t.shareScores}: ${others}\n${url}`
}

export function WinModal({ winner, score, elapsed, scores, names, dailyShareText, dailyStreak, t, onRestart, onClose }: WinModalProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const text = dailyShareText ?? buildShareText(t, winner, score, elapsed, scores, names)
    const url = `${window.location.origin}${window.location.pathname}`
    // Native share sheet on mobile; the user picks the target and confirms there.
    if (navigator.share) {
      try { await navigator.share({ title: 'Formidable', text, url }); return } catch { /* dismissed */ return }
    }
    // Desktop fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — nothing we can safely do */ }
  }

  return (
    <ModalShell maxWidth={380} padding={40} textAlign="center" onClose={onClose} cardClassName="win-modal">
      <div className="win-trophy" style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{winner}</h2>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 4 }}>{score} pt · {fmtTime(elapsed)}</p>
      {dailyStreak != null && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6,
          padding: '4px 12px', borderRadius: 999, background: 'var(--color-primary-subtle)',
          color: 'var(--color-primary)', fontSize: 13, fontWeight: 700,
        }}>🔥 {t.dailyStreakLabel}: {dailyStreak}</div>
      )}

      {/* Per-player final scores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '14px 0 24px' }}>
        {names.map((n, i) => ({ n, s: scores[i], i }))
          .sort((a, b) => b.s - a.s)
          .map(({ n, s, i }) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 13, padding: '4px 10px', borderRadius: 8,
              background: n === winner ? 'var(--color-primary-subtle)' : 'transparent',
              color: n === winner ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: n === winner ? 700 : 400,
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 8 }}>{s}</span>
            </div>
          ))}
      </div>

      <button className="btn-primary" onClick={onRestart} style={{
        width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
        background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
        fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}><RotateCcw size={16} />{t.restart}</button>

      <button onClick={handleShare} style={{
        width: '100%', padding: '10px 0', borderRadius: 10, marginTop: 10, cursor: 'pointer',
        border: '1.5px solid var(--border-default)', background: 'none',
        color: copied ? 'var(--color-primary)' : 'var(--text-secondary)',
        fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        {copied ? <Check size={16} /> : <Share2 size={16} />}
        {copied ? t.shareCopied : t.shareButton}
      </button>
    </ModalShell>
  )
}
