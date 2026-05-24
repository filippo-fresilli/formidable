/**
 * Persistent game-statistics module.
 * Stats are stored in localStorage under the key 'formidable_stats'.
 */

const STATS_KEY = 'formidable_stats'

export interface GameStats {
  gamesPlayed: number
  gamesWon: number
  totalScore: number
  bestScore: number
  totalTurns: number
  fastestWin: number | null  // turns of fastest winning game; null if never won
}

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0,
  bestScore: 0,
  totalTurns: 0,
  fastestWin: null,
}

export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return { ...DEFAULT_STATS }
    return { ...DEFAULT_STATS, ...JSON.parse(raw) } as GameStats
  } catch {
    return { ...DEFAULT_STATS }
  }
}

export function saveStats(s: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s))
  } catch { /* storage unavailable */ }
}

/** Call once at the end of each game. playerWon = true if the human player (index 0) won. */
export function recordGameResult(playerScore: number, playerWon: boolean, turns: number): void {
  const s = loadStats()
  s.gamesPlayed++
  s.totalScore += playerScore
  if (playerScore > s.bestScore) s.bestScore = playerScore
  s.totalTurns += turns
  if (playerWon) {
    s.gamesWon++
    if (s.fastestWin === null || turns < s.fastestWin) s.fastestWin = turns
  }
  saveStats(s)
}

export function clearStats(): void {
  localStorage.removeItem(STATS_KEY)
}
