import type { Shape, Color } from './types'

export const SHAPES: Shape[] = ['T', 'Q', 'C']
export const COLORS: Color[] = ['B', 'R', 'G']
export const ATTRS = ['os', 'oc', 'is', 'ic'] as const

export const COLOR_HEX: Record<Color, string> = {
  B: '#1E7FFF',
  R: '#FF1010',
  G: '#3DC35A',
}

// Player colors: human, bot1, bot2, bot3
export const PLAYER_COLORS      = ['#1A1A2E', '#7B2D8B', '#E8A020', '#2D8B3A']
export const PLAYER_COLORS_DARK = ['#7ab4f5', '#c07fe0', '#E8A020', '#4dc85e']

export const HRAD = 4
export const WIN_SCORE = 50

// Hex grid directions
export const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]
// Line directions (3 axes)
export const LDIRS: [number, number][] = [[1, 0], [0, 1], [1, -1]]
