import { SHAPES, COLORS, ATTRS, HRAD, DIRS, LDIRS, WIN_SCORE } from './constants'
import type { Card, Board, Meeples, Conquered, GameState, Pos } from './types'
import type { I18nDict } from '../i18n'

// ── Hex grid helpers ──────────────────────────────────────────────────────────

export const ck = (q: number, r: number) => `${q},${r}`
export const parseKey = (k: string): [number, number] => k.split(',').map(Number) as [number, number]
export const valid = (q: number, r: number) =>
  Math.abs(q) <= HRAD && Math.abs(r) <= HRAD && Math.abs(q + r) <= HRAD

export const nbrs = (q: number, r: number): Pos[] =>
  DIRS.map(([dq, dr]) => ({ q: q + dq, r: r + dr })).filter((n) => valid(n.q, n.r))

export const sharedTraits = (a: Card, b: Card): number =>
  ATTRS.reduce((n, attr) => n + (a[attr] === b[attr] ? 1 : 0), 0)

export function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i + 30)
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

// ── Deck ─────────────────────────────────────────────────────────────────────

export function makeDeck(): Card[] {
  const d: Card[] = []
  for (const os of SHAPES)
    for (const oc of COLORS)
      for (const is of SHAPES)
        for (const ic of COLORS)
          d.push({ os, oc, is, ic })
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export function buildLine(q: number, r: number, dq: number, dr: number, brd: Board): Pos[] {
  const line: Pos[] = [{ q, r }]
  let cq = q, cr = r
  while (true) { cq += dq; cr += dr; if (!valid(cq, cr) || !brd[ck(cq, cr)]) break; line.push({ q: cq, r: cr }) }
  cq = q; cr = r
  while (true) { cq -= dq; cr -= dr; if (!valid(cq, cr) || !brd[ck(cq, cr)]) break; line.unshift({ q: cq, r: cr }) }
  return line
}

export function subLineLen(cards: Card[], idx: number, attr: keyof Card): number {
  const val = cards[idx][attr]
  let l = idx; while (l > 0 && cards[l - 1][attr] === val) l--
  let r = idx; while (r < cards.length - 1 && cards[r + 1][attr] === val) r++
  return r - l + 1
}

export function calcScore(
  q: number, r: number, brd: Board, t: I18nDict
): { tot: number; details: string[] } {
  if (!brd[ck(q, r)]) return { tot: 0, details: [] }
  let tot = 0
  const details: string[] = []
  for (const [dq, dr] of LDIRS) {
    const line = buildLine(q, r, dq, dr, brd)
    if (line.length < 4) continue
    const idx = line.findIndex((p) => p.q === q && p.r === r)
    const cards = line.map((p) => brd[ck(p.q, p.r)])
    for (const attr of ATTRS) {
      const n = subLineLen(cards, idx, attr)
      if (n >= 4) {
        tot += n
        const val = cards[idx][attr]
        const name = (attr === 'oc' || attr === 'ic') ? t.colorNames[val as 'B'|'R'|'G'] : t.shapeNames[val as 'T'|'Q'|'C']
        details.push(`+${n} ${t.attrLabels[attr]} ${name}`)
      }
    }
  }
  return { tot, details }
}

// Total points a meeple at (q,r) would score on the current board (no i18n needed).
export function scoreTotal(q: number, r: number, brd: Board): number {
  if (!brd[ck(q, r)]) return 0
  let tot = 0
  for (const [dq, dr] of LDIRS) {
    const line = buildLine(q, r, dq, dr, brd)
    if (line.length < 4) continue
    const idx = line.findIndex((p) => p.q === q && p.r === r)
    const cards = line.map((p) => brd[ck(p.q, p.r)])
    for (const attr of ATTRS) {
      const n = subLineLen(cards, idx, attr)
      if (n >= 4) tot += n
    }
  }
  return tot
}

// Cells belonging to scoring lines through (q,r) — the cards that "light up".
export function getScoreCells(q: number, r: number, brd: Board): Set<string> {
  const contrib = new Set<string>()
  for (const [dq, dr] of LDIRS) {
    const line = buildLine(q, r, dq, dr, brd)
    if (line.length < 4) continue
    const idx = line.findIndex((p) => p.q === q && p.r === r)
    const cards = line.map((p) => brd[ck(p.q, p.r)])
    for (const attr of ATTRS) {
      if (subLineLen(cards, idx, attr) >= 4)
        for (const p of line) contrib.add(ck(p.q, p.r))
    }
  }
  return contrib
}

export function getBurnCells(q: number, r: number, brd: Board, meepAfter: Meeples): Set<string> {
  const burn = new Set([ck(q, r)])
  const contrib = getScoreCells(q, r, brd)
  for (const nb of nbrs(q, r)) {
    const k = ck(nb.q, nb.r)
    if (contrib.has(k) && meepAfter[k] === undefined) burn.add(k)
  }
  return burn
}

// ── Meeple withdraw ───────────────────────────────────────────────────────────

export interface WithdrawResult {
  pts: number
  details: string[]
  isConq: boolean
  /** Cells whose cards lit up because they scored (for the score animation). */
  scoreCells: string[]
  /** Cells whose cards were burned by this withdraw. */
  burnCells: string[]
}

export function doWithdraw(
  g: GameState, idx: number, key: string, t: I18nDict
): WithdrawResult {
  const [bq, br] = parseKey(key)
  const isConq = !!g.conquered[key]
  const { tot: pts, details } = calcScore(bq, br, g.board, t)
  // Capture scoring cells BEFORE any burning removes cards from the board.
  const scoreCells = pts > 0 ? [...getScoreCells(bq, br, g.board)] : []
  g.scores[idx] += pts
  delete g.meeples[key]
  g.tokens[idx]++
  const burnCells: string[] = []
  if (isConq && pts > 0) {
    const burned = getBurnCells(bq, br, g.board, g.meeples)
    for (const bk of burned) {
      if (g.board[bk]) { burnCells.push(bk); g.discard.push(g.board[bk]); delete g.board[bk]; delete g.conquered[bk] }
    }
  }
  if (g.scores[idx] >= WIN_SCORE) g.gameOver = true
  return { pts, details, isConq, scoreCells, burnCells }
}

// ── Game factory ──────────────────────────────────────────────────────────────

export function makeGame(numPlayers = 2): GameState {
  const deck = makeDeck()
  const board: Board = {}
  const conquered: Conquered = {}
  const STARTS: Pos[] = [
    { q: 0, r: 0 }, { q: 1, r: 0 }, { q: -1, r: 0 },
    { q: 0, r: 1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: -1, r: 1 },
  ]
  for (const s of STARTS) if (deck.length) board[ck(s.q, s.r)] = deck.pop()!

  const hands: Card[][] = Array.from({ length: numPlayers }, () => [])
  for (let i = 0; i < 3; i++)
    for (let p = 0; p < numPlayers; p++)
      if (deck.length) hands[p].push(deck.pop()!)

  const firstTurn = Math.floor(Math.random() * numPlayers)
  return {
    numPlayers, deck, discard: [],
    scores: Array(numPlayers).fill(0),
    hands, tokens: Array(numPlayers).fill(2),
    board, conquered, meeples: {},
    turn: firstTurn, phase: 'place', selIdx: -1,
    log: [], placedPos: null, gameOver: false,
  }
}

export function cloneGame(g: GameState): GameState {
  return {
    ...g,
    board: { ...g.board },
    meeples: { ...g.meeples },
    conquered: { ...g.conquered },
    scores: [...g.scores],
    hands: g.hands.map((h) => [...h]),
    tokens: [...g.tokens],
    deck: [...g.deck],
    discard: [...g.discard],
    log: [...g.log],
  }
}

export function replenishHand(g: GameState, p: number): void {
  while (g.deck.length > 0 && g.hands[p].length < 3)
    g.hands[p].push(g.deck.pop()!)
}

// ── Pre-computed cell list ────────────────────────────────────────────────────

export const ALL_CELLS: Pos[] = []
for (let q = -HRAD; q <= HRAD; q++)
  for (let r = -HRAD; r <= HRAD; r++)
    if (valid(q, r)) ALL_CELLS.push({ q, r })
