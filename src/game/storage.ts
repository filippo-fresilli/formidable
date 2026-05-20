import type { GameState } from './types'
import type { Lang } from '../i18n'
import type { Difficulty } from './ai'

const SAVE_KEY = 'formidabile_v1'
const SETTINGS_KEY = 'formidabile_settings_v1'

export interface SaveData {
  game: GameState
  elapsed: number
}

export type Theme = 'light' | 'dark'

export interface Settings {
  lang: Lang
  numPlayers: number
  difficulty: Difficulty
  theme: Theme
  playerName: string
  muted: boolean
}

// ── Game state ────────────────────────────────────────────────────────────────

export function saveGame(game: GameState, elapsed: number): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ game, elapsed } satisfies SaveData))
  } catch { /* storage full or unavailable */ }
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SaveData
  } catch { return null }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
}

// ── Settings (lang, players, difficulty) ──────────────────────────────────────

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch { /* ignore */ }
}

export function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Settings
  } catch { return null }
}
