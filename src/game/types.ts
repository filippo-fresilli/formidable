export type Shape = 'T' | 'Q' | 'C'
export type Color = 'B' | 'R' | 'G'

export interface Card {
  os: Shape
  oc: Color
  is: Shape
  ic: Color
}

export interface Pos {
  q: number
  r: number
}

export type Board = Record<string, Card>
export type Meeples = Record<string, number>   // cellKey → playerIndex
export type Conquered = Record<string, boolean>

export interface GameState {
  numPlayers: number
  deck: Card[]
  discard: Card[]
  scores: number[]
  hands: Card[][]
  tokens: number[]
  board: Board
  conquered: Conquered
  meeples: Meeples
  turn: number
  phase: 'place' | 'meeple' | 'withdraw' | 'draw'
  selIdx: number
  log: string[]
  placedPos: Pos | null
  gameOver: boolean
  lastAction?: string
}

/** Transient visual feedback for a scoring/burning withdraw (not persisted). */
export interface Flash {
  id: number
  pts: number
  key: string
  scoreCells: string[]
  burnCells: string[]
}

export interface HistoryState {
  past: GameState[]
  present: GameState
  future: GameState[]
}

export type HistoryAction =
  | { type: 'COMMIT'; game: GameState }
  | { type: 'REPLACE'; game: GameState }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; game: GameState }
