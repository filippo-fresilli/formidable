import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import type { I18nDict } from '../i18n'
import { loadStats } from '../game/stats'
import { currentStreak, loadDaily } from '../game/daily'
import { ModalShell } from './ModalShell'

// ── Wordle-style stat card ─────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{
      flex: '1 1 0', minWidth: 0, textAlign: 'center',
      background: 'var(--bg-panel-alt)',
      border: '1px solid var(--border-default)',
      borderRadius: 10, padding: '10px 4px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      minHeight: 72,
    }}>
      <div style={{
        fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
        lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      <div style={{
        fontSize: 9, color: 'var(--text-muted)', marginTop: 5,
        textTransform: 'uppercase', letterSpacing: '.03em', lineHeight: 1.3,
        textAlign: 'center',
      }}>{label}</div>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label, subtitle }: { label: string; subtitle?: string }) {
  return (
    <div style={{ marginTop: 20, marginBottom: 10 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '.06em',
      }}>{label}</div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  )
}

// ── Simulation data (1000 games, medium difficulty) ───────────────────────────

const SIM_DATA = [
  { players: '2p', avgTurns: 29, range: '15–45', avgPts: 46, winChance: '50%' },
  { players: '3p', avgTurns: 39, range: '22–62', avgPts: 42, winChance: '33%' },
  { players: '4p', avgTurns: 48, range: '23–56', avgPts: 39, winChance: '25%' },
]

function SimTable({ t }: { t: I18nDict }) {
  const cols = [t.statsSimAvgTurns, t.statsSimRange, t.statsSimAvgPts, t.statsSimWinChance]
  const cellStyle = (bold?: boolean): React.CSSProperties => ({
    fontSize: 12, textAlign: 'center', padding: '6px 4px',
    color: bold ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: bold ? 700 : 400,
  })
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
            <th style={{ ...cellStyle(), textAlign: 'left', paddingLeft: 0 }}></th>
            {cols.map(c => (
              <th key={c} style={{ ...cellStyle(), fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SIM_DATA.map(row => (
            <tr key={row.players} style={{ borderBottom: '1px solid var(--border-default)' }}>
              <td style={{ ...cellStyle(true), textAlign: 'left', paddingLeft: 0 }}>{row.players}</td>
              <td style={cellStyle()}>{row.avgTurns}</td>
              <td style={cellStyle()}>{row.range}</td>
              <td style={cellStyle()}>{row.avgPts} pt</td>
              <td style={cellStyle()}>{row.winChance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── StatsModal ────────────────────────────────────────────────────────────────

interface StatsModalProps {
  t: I18nDict
  onClose: () => void
}

export function StatsModal({ t, onClose }: StatsModalProps) {
  const s = loadStats()
  const hasData = s.gamesPlayed > 0
  const avgTurns = hasData ? Math.round(s.totalTurns / s.gamesPlayed) : '—'
  const winPct   = hasData ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0
  const winRate  = hasData ? `${winPct}%` : '—'
  const avgScore = hasData ? (s.totalScore / s.gamesPlayed).toFixed(1) : '—'
  const streak   = currentStreak()
  const best     = loadDaily().bestStreak

  const [copied, setCopied] = useState(false)
  async function handleShare() {
    const url = `${window.location.origin}${window.location.pathname}`
    const text = `📊 Formidable\n${t.statsPlayedShort}: ${s.gamesPlayed} · ${t.statsWinShort}: ${winPct}%\n🔥 ${t.dailyStreakLabel}: ${streak} (${t.statsBestStreak}: ${best})\n${url}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Formidable', text, url }); return } catch { return }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  return (
    <ModalShell maxWidth={400} padding={28} onClose={onClose} hideCloseButton>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ flex: 1, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {t.statsTitle}
        </h2>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: 'var(--text-faint)', padding: 4, lineHeight: 1,
        }}>✕</button>
      </div>

      {/* ── Statistiche del giocatore ── */}
      <SectionHeader label={t.statsPlayerSection} />

      {/* Row 1: played · win% · streak · best */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <StatCard value={s.gamesPlayed} label={t.statsPlayedShort} />
        <StatCard value={hasData ? winRate : '—'} label={t.statsWinShort} />
        <StatCard value={streak} label={t.dailyStreakLabel} />
        <StatCard value={best} label={t.statsBestStreak} />
      </div>

      {/* Row 2: best score · avg score · avg turns · fastest win */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <StatCard value={hasData ? `${s.bestScore}` : '—'} label={t.statsBestScore} />
        <StatCard value={hasData ? `${avgScore}` : '—'} label={t.statsAvgScore} />
        <StatCard value={hasData ? `${avgTurns}` : '—'} label={t.statsAvgTurns} />
        <StatCard value={hasData && s.fastestWin !== null ? `${s.fastestWin}` : '—'} label={t.statsFastestWin} />
      </div>

      {!hasData && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '12px 0 0' }}>
          {t.statsNoData}
        </p>
      )}

      {/* Share CTA */}
      <button onClick={handleShare} style={{
        width: '100%', padding: '10px 0', borderRadius: 10, marginTop: 16, cursor: 'pointer',
        border: 'none', background: 'var(--color-primary)', color: '#fff',
        fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        {copied ? <Check size={16} /> : <Share2 size={16} />}
        {copied ? t.shareCopied : t.shareButton}
      </button>

      {/* ── Statistiche del gioco ── */}
      <SectionHeader label={t.statsGameSection} subtitle={t.statsSimSubtitle} />
      <SimTable t={t} />
    </ModalShell>
  )
}
