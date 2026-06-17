// ── Daily challenge ───────────────────────────────────────────────────────────
// A deterministic game seeded by the calendar day: everyone gets the same deck
// and the same (medium, deterministic) bot, so the result is a pure-skill,
// Wordle-style comparison. Played once per day; tracks a day streak.

const STORE_KEY = 'formidable_daily_v1'
// Day #1 = this date. Used only for the shareable "#N" label.
const EPOCH = new Date(2026, 0, 1)

export interface DailyState {
  /** dayIndex of the last completed daily, or null */
  lastDay: number | null
  /** consecutive-day streak as of lastDay */
  streak: number
  bestStreak: number
  /** result of the last completed daily */
  last: { day: number; won: boolean; score: number; turns: number; elapsed: number } | null
}

const EMPTY: DailyState = { lastDay: null, streak: 0, bestStreak: 0, last: null }

// Deterministic PRNG (mulberry32) — same seed ⇒ same sequence.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Whole-day index since EPOCH, based on the player's local calendar day. */
export function dayIndex(d: Date = new Date()): number {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.floor((local.getTime() - EPOCH.getTime()) / 86_400_000)
}

/** Human-facing puzzle number (#1, #2, …). */
export function dayNumber(d: Date = new Date()): number {
  return dayIndex(d) + 1
}

/** Seeded RNG for a given day. */
export function dailyRng(day: number = dayIndex()): () => number {
  return mulberry32((day + 1) * 0x9e3779b9)
}

export function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    return { ...EMPTY }
  }
}

function saveDaily(s: DailyState): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

/** Has today's daily already been completed? */
export function hasPlayedToday(): boolean {
  return loadDaily().lastDay === dayIndex()
}

/** Current live streak (0 if it was broken by a missed day). */
export function currentStreak(): number {
  const s = loadDaily()
  if (s.lastDay === null) return 0
  const today = dayIndex()
  if (s.lastDay === today || s.lastDay === today - 1) return s.streak
  return 0 // missed at least one day → broken
}

/** Record completion of today's daily and update the streak. Idempotent per day. */
export function recordDailyResult(r: { won: boolean; score: number; turns: number; elapsed: number }): DailyState {
  const s = loadDaily()
  const today = dayIndex()
  if (s.lastDay === today) return s // already recorded today
  const continues = s.lastDay === today - 1
  const streak = continues ? s.streak + 1 : 1
  const next: DailyState = {
    lastDay: today,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    last: { day: today, ...r },
  }
  saveDaily(next)
  return next
}
