import { ck, parseKey, nbrs, sharedTraits, calcScore, doWithdraw, replenishHand, buildLine, subLineLen } from './logic'
import { ATTRS, LDIRS } from './constants'
import type { GameState, Board } from './types'
import type { I18nDict } from '../i18n'

export type Difficulty = 'easy' | 'medium' | 'hard'

// ── Shared helpers ────────────────────────────────────────────────────────────

function getCandidates(g: GameState): Set<string> {
  const cands = new Set<string>()
  for (const k of Object.keys(g.board)) {
    const [q2, r2] = parseKey(k)
    for (const nb of nbrs(q2, r2)) if (!g.board[ck(nb.q, nb.r)]) cands.add(ck(nb.q, nb.r))
    if (g.meeples[k] === undefined) cands.add(k)
  }
  return cands
}

// How close this cell is to completing a scoring line (rewards partial 3-card runs).
// Returns a bonus to add on top of the immediate score.
function potentialBonus(q: number, r: number, brd: Board): number {
  let bonus = 0
  for (const [dq, dr] of LDIRS) {
    const line = buildLine(q, r, dq, dr, brd)
    if (line.length < 2) continue
    const idx = line.findIndex(p => p.q === q && p.r === r)
    if (idx === -1) continue
    const cards = line.map(p => brd[ck(p.q, p.r)])
    if (cards.some(c => !c)) continue
    for (const attr of ATTRS) {
      const n = subLineLen(cards, idx, attr)
      if (n === 3) bonus += 3   // one card away from scoring
      else if (n === 2) bonus += 1
    }
  }
  return bonus
}

// Best score any opponent meeple could currently achieve.
function opponentBestScore(g: GameState, idx: number, t: I18nDict): number {
  let best = 0
  for (const [k, owner] of Object.entries(g.meeples)) {
    if (owner === idx) continue
    const [q, r] = parseKey(k)
    const { tot } = calcScore(q, r, g.board, t)
    if (tot > best) best = tot
  }
  return best
}

// ── Easy bot: mostly random ───────────────────────────────────────────────────

function runEasyTurn(g: GameState, idx: number, t: I18nDict): string {
  const names = [t.player1, t.bot1, t.bot2, t.bot3]
  let desc = names[idx]

  const cands = getCandidates(g)
  const empties = [...cands].filter(k => !g.board[k])

  let placedKey: string | null = null
  if (empties.length > 0 && g.hands[idx].length > 0) {
    placedKey = empties[Math.floor(Math.random() * empties.length)]
    const ci = Math.floor(Math.random() * g.hands[idx].length)
    const [cq, cr] = parseKey(placedKey)
    g.board[placedKey] = g.hands[idx][ci]
    g.hands[idx].splice(ci, 1)
    replenishHand(g, idx)
    desc += ` → (${cq},${cr})`
  }

  // Random meeple decision
  const mine = Object.entries(g.meeples).filter(([, v]) => v === idx)
  if (Math.random() > 0.5 && placedKey && g.tokens[idx] > 0 && g.meeples[placedKey] === undefined) {
    g.meeples[placedKey] = idx; g.tokens[idx]--
    desc += ' · ●'
  } else if (mine.length > 0) {
    const [k] = mine[Math.floor(Math.random() * mine.length)]
    const { pts } = doWithdraw(g, idx, k, t)
    desc += ` · ↩ +${pts}pt`
  } else if (placedKey && g.tokens[idx] > 0) {
    g.meeples[placedKey] = idx; g.tokens[idx]--
    desc += ' · ●'
  }

  return desc
}

// ── Medium bot: greedy immediate score ────────────────────────────────────────

function runMediumTurn(g: GameState, idx: number, t: I18nDict): string {
  const names = [t.player1, t.bot1, t.bot2, t.bot3]
  let desc = names[idx]

  const cands = getCandidates(g)
  let bestScore = -1
  let mv: { q: number; r: number; ci: number; conq: boolean } | null = null

  for (let ci = 0; ci < g.hands[idx].length; ci++) {
    const card = g.hands[idx][ci]
    for (const cki of cands) {
      const [cq, cr] = parseKey(cki)
      const ex = g.board[cki]
      const pts = calcScore(cq, cr, { ...g.board, [cki]: card }, t).tot
      if (ex && g.meeples[cki] === undefined && sharedTraits(card, ex) >= 2 && g.tokens[idx] > 0) {
        if (pts > bestScore) { bestScore = pts; mv = { q: cq, r: cr, ci, conq: true } }
      } else if (!ex) {
        if (pts > bestScore) { bestScore = pts; mv = { q: cq, r: cr, ci, conq: false } }
      }
    }
  }
  if (!mv && g.hands[idx].length > 0) {
    const empties = [...cands].filter(k => !g.board[k])
    if (empties.length) { const [cq, cr] = parseKey(empties[0]); mv = { q: cq, r: cr, ci: 0, conq: false } }
  }

  let placedKey: string | null = null
  if (mv) {
    placedKey = ck(mv.q, mv.r)
    if (mv.conq) { g.discard.push(g.board[placedKey]); g.conquered[placedKey] = true }
    g.board[placedKey] = g.hands[idx][mv.ci]
    g.hands[idx].splice(mv.ci, 1)
    replenishHand(g, idx)
    desc += ` → (${mv.q},${mv.r})${mv.conq ? ' ⚔️' : ''}`
  }

  if (mv?.conq) {
    if (g.tokens[idx] > 0) { g.meeples[placedKey!] = idx; g.tokens[idx]-- }
    return desc
  }

  let bestKey: string | null = null; let bestPts = -1
  for (const [k, v] of Object.entries(g.meeples)) {
    if (v !== idx) continue
    const [cq, cr] = parseKey(k)
    const { tot } = calcScore(cq, cr, g.board, t)
    if (tot > bestPts) { bestPts = tot; bestKey = k }
  }

  if (bestKey !== null && (bestPts > 0 || g.tokens[idx] === 0)) {
    const { pts, details } = doWithdraw(g, idx, bestKey, t)
    desc += ` · ↩ +${pts}pt${details.length ? ` (${details.join(', ')})` : ''}`
  } else if (placedKey && g.tokens[idx] > 0 && g.meeples[placedKey] === undefined) {
    g.meeples[placedKey] = idx; g.tokens[idx]--
    desc += ' · ●'
  } else if (bestKey !== null) {
    const { pts } = doWithdraw(g, idx, bestKey, t)
    desc += ` · ↩ +${pts}pt`
  }

  return desc
}

// ── Hard bot: greedy + potential lines + defensive ────────────────────────────

function runHardTurn(g: GameState, idx: number, t: I18nDict): string {
  const names = [t.player1, t.bot1, t.bot2, t.bot3]
  let desc = names[idx]

  const cands = getCandidates(g)

  // Evaluate each placement with: immediate score + potential bonus
  let bestEval = -1
  let mv: { q: number; r: number; ci: number; conq: boolean } | null = null

  for (let ci = 0; ci < g.hands[idx].length; ci++) {
    const card = g.hands[idx][ci]
    for (const cki of cands) {
      const [cq, cr] = parseKey(cki)
      const ex = g.board[cki]
      const boardAfter = { ...g.board, [cki]: card }
      const immediate = calcScore(cq, cr, boardAfter, t).tot
      const potential = potentialBonus(cq, cr, boardAfter)

      if (ex && g.meeples[cki] === undefined && sharedTraits(card, ex) >= 2 && g.tokens[idx] > 0) {
        // Conquest: value immediate score heavily, conquest is strategic
        const eval_ = immediate * 2 + potential
        if (eval_ > bestEval) { bestEval = eval_; mv = { q: cq, r: cr, ci, conq: true } }
      } else if (!ex) {
        const eval_ = immediate + potential
        if (eval_ > bestEval) { bestEval = eval_; mv = { q: cq, r: cr, ci, conq: false } }
      }
    }
  }
  if (!mv && g.hands[idx].length > 0) {
    const empties = [...cands].filter(k => !g.board[k])
    if (empties.length) { const [cq, cr] = parseKey(empties[0]); mv = { q: cq, r: cr, ci: 0, conq: false } }
  }

  let placedKey: string | null = null
  if (mv) {
    placedKey = ck(mv.q, mv.r)
    if (mv.conq) { g.discard.push(g.board[placedKey]); g.conquered[placedKey] = true }
    g.board[placedKey] = g.hands[idx][mv.ci]
    g.hands[idx].splice(mv.ci, 1)
    replenishHand(g, idx)
    desc += ` → (${mv.q},${mv.r})${mv.conq ? ' ⚔️' : ''}`
  }

  // Conquest: always place meeple immediately
  if (mv?.conq) {
    if (g.tokens[idx] > 0) { g.meeples[placedKey!] = idx; g.tokens[idx]-- }
    return desc
  }

  // Meeple decision: evaluate all own meeples + potential new placement
  // Score each own meeple's current value
  let bestWithdrawKey: string | null = null
  let bestWithdrawPts = -1
  for (const [k, v] of Object.entries(g.meeples)) {
    if (v !== idx) continue
    const [cq, cr] = parseKey(k)
    const { tot } = calcScore(cq, cr, g.board, t)
    if (tot > bestWithdrawPts) { bestWithdrawPts = tot; bestWithdrawKey = k }
  }

  // A meeple may only be placed on the tile just played this turn — never on an
  // existing tile. Evaluate only that cell's potential.
  let bestPlaceKey: string | null = null
  if (g.tokens[idx] > 0 && placedKey && g.meeples[placedKey] === undefined) {
    bestPlaceKey = placedKey
  }

  // Decision logic:
  // 1. If a withdrawal scores well (>= 8 pts), take it — high-value scores shouldn't wait
  // 2. If opponent is about to score big, withdraw now even for fewer points
  // 3. If we can place on a high-potential cell, prefer that over low-value withdrawal
  // 4. If out of tokens, must withdraw
  const opponentThreat = opponentBestScore(g, idx, t)
  const shouldWithdrawUrgently = opponentThreat >= 12

  if (g.tokens[idx] === 0 && bestWithdrawKey !== null) {
    const { pts, details } = doWithdraw(g, idx, bestWithdrawKey, t)
    desc += ` · ↩ +${pts}pt${details.length ? ` (${details.join(', ')})` : ''}`
  } else if (bestWithdrawPts >= 8 || shouldWithdrawUrgently) {
    if (bestWithdrawKey !== null) {
      const { pts, details } = doWithdraw(g, idx, bestWithdrawKey, t)
      desc += ` · ↩ +${pts}pt${details.length ? ` (${details.join(', ')})` : ''}`
    }
  } else if (bestPlaceKey !== null && g.tokens[idx] > 0) {
    // Place meeple on the best potential cell (could be placed card or elsewhere)
    if (g.meeples[bestPlaceKey] === undefined) {
      g.meeples[bestPlaceKey] = idx; g.tokens[idx]--
      desc += ` · ● (${bestPlaceKey})`
    }
  } else if (bestWithdrawKey !== null && bestWithdrawPts > 0) {
    const { pts, details } = doWithdraw(g, idx, bestWithdrawKey, t)
    desc += ` · ↩ +${pts}pt${details.length ? ` (${details.join(', ')})` : ''}`
  } else if (placedKey && g.tokens[idx] > 0 && g.meeples[placedKey] === undefined) {
    g.meeples[placedKey] = idx; g.tokens[idx]--
    desc += ' · ●'
  } else if (bestWithdrawKey !== null) {
    const { pts } = doWithdraw(g, idx, bestWithdrawKey, t)
    desc += ` · ↩ +${pts}pt`
  }

  return desc
}

// ── Public entry point ────────────────────────────────────────────────────────

export function runCpuTurn(g: GameState, idx: number, t: I18nDict, difficulty: Difficulty = 'medium'): string {
  switch (difficulty) {
    case 'easy':   return runEasyTurn(g, idx, t)
    case 'medium': return runMediumTurn(g, idx, t)
    case 'hard':   return runHardTurn(g, idx, t)
  }
}
