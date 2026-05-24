/**
 * Headless game simulator — runs N games bot-vs-bot with no React or browser.
 * Usage: npm run simulate
 * Options (env vars):
 *   GAMES=500        number of games to simulate (default 200)
 *   PLAYERS=2        number of players: 2 | 3 | 4 (default 2)
 *   DIFF=hard,easy   comma-separated difficulty per player slot (default medium for all)
 *
 * Example:
 *   GAMES=500 PLAYERS=3 DIFF=hard,medium,easy npm run simulate
 */

import { makeGame } from './logic'
import { runCpuTurn, type Difficulty } from './ai'
import { I18N } from '../i18n'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameResult {
  winnerIdx: number
  finalScores: number[]
  rounds: number
}

interface SimStats {
  gamesPlayed: number
  numPlayers: number
  difficulties: Difficulty[]
  wins: number[]          // win count per player slot
  totalScores: number[]   // sum of all final scores per slot (for average)
  totalRounds: number
  minScore: number[]
  maxScore: number[]
  /** How many games ended in exactly N rounds */
  roundsHistogram: Map<number, number>
  /** Score buckets: 0-9, 10-19, 20-29, 30-39, 40-49, 50 */
  scoreBuckets: number[][]
}

// ── Single game simulation ────────────────────────────────────────────────────

function simulateOne(numPlayers: number, difficulties: Difficulty[]): GameResult {
  const t = I18N['it']
  const g = makeGame(numPlayers)
  let rounds = 0
  const MAX_ROUNDS = 500  // safety cap against degenerate games

  while (!g.gameOver && rounds < MAX_ROUNDS) {
    const idx = g.turn
    runCpuTurn(g, idx, t, difficulties[idx % difficulties.length])
    if (g.gameOver) break
    g.turn = (g.turn + 1) % g.numPlayers
    g.phase = 'place'
    g.placedPos = null
    g.selIdx = -1
    rounds++
  }

  const winnerIdx = g.scores.indexOf(Math.max(...g.scores))
  return { winnerIdx, finalScores: [...g.scores], rounds }
}

// ── Bucket helpers ────────────────────────────────────────────────────────────

function scoreBucket(score: number): number {
  if (score >= 50) return 5
  return Math.floor(score / 10)
}

const BUCKET_LABELS = ['0-9', '10-19', '20-29', '30-39', '40-49', '50']

// ── Run simulation ────────────────────────────────────────────────────────────

function runSimulation(gamesTotal: number, numPlayers: number, difficulties: Difficulty[]): SimStats {
  const stats: SimStats = {
    gamesPlayed: 0,
    numPlayers,
    difficulties,
    wins: Array(numPlayers).fill(0),
    totalScores: Array(numPlayers).fill(0),
    totalRounds: 0,
    minScore: Array(numPlayers).fill(Infinity),
    maxScore: Array(numPlayers).fill(-Infinity),
    roundsHistogram: new Map(),
    scoreBuckets: Array.from({ length: numPlayers }, () => Array(6).fill(0)),
  }

  for (let i = 0; i < gamesTotal; i++) {
    const { winnerIdx, finalScores, rounds } = simulateOne(numPlayers, difficulties)
    stats.wins[winnerIdx]++
    stats.totalRounds += rounds
    stats.roundsHistogram.set(rounds, (stats.roundsHistogram.get(rounds) ?? 0) + 1)
    for (let p = 0; p < numPlayers; p++) {
      stats.totalScores[p] += finalScores[p]
      if (finalScores[p] < stats.minScore[p]) stats.minScore[p] = finalScores[p]
      if (finalScores[p] > stats.maxScore[p]) stats.maxScore[p] = finalScores[p]
      stats.scoreBuckets[p][scoreBucket(finalScores[p])]++
    }
    stats.gamesPlayed++
  }

  return stats
}

// ── Report printer ────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  return `${((n / total) * 100).toFixed(1)}%`
}
function avg(total: number, n: number) {
  return (total / n).toFixed(2)
}
function bar(count: number, total: number, width = 20) {
  const filled = Math.round((count / total) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function printReport(s: SimStats) {
  const line = '─'.repeat(52)
  const PLAYER_NAMES = ['Giocatore 1', 'Bot 1', 'Bot 2', 'Bot 3']

  console.log('\n' + '═'.repeat(52))
  console.log('  FORMIDABLE — SIMULAZIONE HEADLESS')
  console.log('═'.repeat(52))
  console.log(`  Partite simulate : ${s.gamesPlayed}`)
  console.log(`  Giocatori        : ${s.numPlayers}`)
  console.log(`  Difficoltà       : ${s.difficulties.join(', ')}`)
  console.log(`  Turni medi       : ${avg(s.totalRounds, s.gamesPlayed)}`)

  // Sorted rounds histogram (most common game lengths)
  const sortedRounds = [...s.roundsHistogram.entries()].sort((a, b) => a[0] - b[0])
  const p10 = sortedRounds.findIndex(() => {
    let cum = 0
    for (const [, cc] of sortedRounds) { cum += cc; if (cum >= s.gamesPlayed * 0.1) return true }
    return false
  })
  const p90Idx = sortedRounds.reduce((acc, _entry, i) => {
    let cum = 0; for (let j = 0; j <= i; j++) cum += sortedRounds[j][1]
    return cum <= s.gamesPlayed * 0.9 ? i : acc
  }, 0)
  if (sortedRounds.length > 0) {
    console.log(`  Turni min/max    : ${sortedRounds[0][0]} / ${sortedRounds[sortedRounds.length - 1][0]}`)
    if (p10 >= 0 && p90Idx >= 0) {
      console.log(`  Turni p10/p90    : ${sortedRounds[Math.max(0, p10)][0]} / ${sortedRounds[p90Idx][0]}`)
    }
  }

  console.log('\n' + line)
  console.log('  VITTORIE PER GIOCATORE')
  console.log(line)
  for (let p = 0; p < s.numPlayers; p++) {
    const name = `${PLAYER_NAMES[p]} (${s.difficulties[p % s.difficulties.length]})`
    const w = s.wins[p]
    console.log(`  ${name.padEnd(28)} ${String(w).padStart(4)} vittorie  ${pct(w, s.gamesPlayed).padStart(6)}`)
    console.log(`  ${''.padEnd(28)} ${bar(w, s.gamesPlayed)}`)
  }

  console.log('\n' + line)
  console.log('  PUNTEGGI FINALI MEDI')
  console.log(line)
  for (let p = 0; p < s.numPlayers; p++) {
    const name = `${PLAYER_NAMES[p]} (${s.difficulties[p % s.difficulties.length]})`
    const a = parseFloat(avg(s.totalScores[p], s.gamesPlayed))
    console.log(`  ${name.padEnd(28)} avg ${String(a.toFixed(1)).padStart(5)}  min ${String(s.minScore[p]).padStart(2)}  max ${s.maxScore[p]}`)
  }

  console.log('\n' + line)
  console.log('  DISTRIBUZIONE PUNTEGGI (per giocatore)')
  console.log(line)
  for (let p = 0; p < s.numPlayers; p++) {
    const name = `${PLAYER_NAMES[p]}`
    console.log(`\n  ${name}:`)
    for (let b = 0; b < 6; b++) {
      const count = s.scoreBuckets[p][b]
      console.log(`    ${BUCKET_LABELS[b].padEnd(6)} ${bar(count, s.gamesPlayed, 24)} ${pct(count, s.gamesPlayed).padStart(6)}`)
    }
  }

  console.log('\n' + '═'.repeat(52) + '\n')
}

// ── Entry point ───────────────────────────────────────────────────────────────

const GAMES    = parseInt(process.env['GAMES']   ?? '200', 10)
const PLAYERS  = parseInt(process.env['PLAYERS'] ?? '2',   10) as 2 | 3 | 4
const DIFF_RAW = (process.env['DIFF'] ?? 'medium').split(',')
const DIFFS    = DIFF_RAW.map((d: string) => (d.trim() || 'medium') as Difficulty)

// Pad difficulties array to cover all player slots
const difficulties: Difficulty[] = Array.from(
  { length: PLAYERS },
  (_, i) => DIFFS[i % DIFFS.length]
)

console.log(`\nSimulo ${GAMES} partite con ${PLAYERS} giocatori (${difficulties.join(' vs ')})…`)
const t0 = Date.now()
const stats = runSimulation(GAMES, PLAYERS, difficulties)
const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
console.log(`Completato in ${elapsed}s`)
printReport(stats)
