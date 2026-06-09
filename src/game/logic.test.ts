import { describe, it, expect } from 'vitest'
import {
  ck, parseKey, valid, nbrs, sharedTraits,
  hexPoints, makeDeck, buildLine, subLineLen,
  calcScore, doWithdraw, makeGame, cloneGame,
  replenishHand, getBurnCells,
} from './logic'
import { runCpuTurn } from './ai'
import { I18N } from '../i18n'
import type { Board, Card, GameState } from './types'

const t = I18N['it']

// ── Helpers ───────────────────────────────────────────────────────────────────

describe('ck / parseKey', () => {
  it('converte coordinate in chiave e viceversa', () => {
    expect(ck(3, -2)).toBe('3,-2')
    expect(parseKey('3,-2')).toEqual([3, -2])
    expect(parseKey(ck(0, 0))).toEqual([0, 0])
  })
})

describe('valid', () => {
  it('accetta celle dentro il raggio HRAD=3', () => {
    expect(valid(0, 0)).toBe(true)
    expect(valid(3, 0)).toBe(true)
    expect(valid(0, 3)).toBe(true)
    expect(valid(-3, 3)).toBe(true)
  })
  it('rifiuta celle fuori dal raggio', () => {
    expect(valid(5, 0)).toBe(false)   // |q| = 5 > HRAD=4
    expect(valid(0, 5)).toBe(false)   // |r| = 5 > HRAD=4
    expect(valid(4, 4)).toBe(false)   // |q+r| = 8 > 4
    expect(valid(-5, -5)).toBe(false)
  })
})

describe('nbrs', () => {
  it('il centro ha 6 vicini', () => {
    expect(nbrs(0, 0)).toHaveLength(6)
  })
  it('un angolo ha meno vicini (bordo esagonale)', () => {
    // (4,0) è sul bordo con HRAD=4: alcuni vicini sarebbero fuori dal valid range
    const n = nbrs(4, 0)
    expect(n.length).toBeLessThan(6)
    expect(n.length).toBeGreaterThan(0)
  })
  it('tutti i vicini sono valid', () => {
    for (const nb of nbrs(1, -1)) {
      expect(valid(nb.q, nb.r)).toBe(true)
    }
  })
})

describe('sharedTraits', () => {
  it('stessa carta → 4 attributi in comune', () => {
    const c = { oc: 'B', os: 'C', ic: 'R', is: 'T' } as const
    expect(sharedTraits(c, c)).toBe(4)
  })
  it('carte completamente diverse → 0', () => {
    const a = { oc: 'B', os: 'C', ic: 'R', is: 'T' } as const
    const b = { oc: 'R', os: 'T', ic: 'G', is: 'Q' } as const
    expect(sharedTraits(a, b)).toBe(0)
  })
  it('condividono 2 attributi', () => {
    const a = { oc: 'B', os: 'C', ic: 'R', is: 'T' } as const
    const b = { oc: 'B', os: 'T', ic: 'R', is: 'Q' } as const
    expect(sharedTraits(a, b)).toBe(2) // oc=B e ic=R in comune
  })
})

describe('hexPoints', () => {
  it('produce 6 punti separati da virgola', () => {
    const pts = hexPoints(100, 100, 30)
    const pairs = pts.split(' ')
    expect(pairs).toHaveLength(6)
    for (const p of pairs) {
      const [x, y] = p.split(',').map(Number)
      expect(x).not.toBeNaN()
      expect(y).not.toBeNaN()
    }
  })
})

// ── Mazzo ─────────────────────────────────────────────────────────────────────

describe('makeDeck', () => {
  it('produce 81 carte (3 forme × 3 colori × 3 forme × 3 colori)', () => {
    expect(makeDeck()).toHaveLength(81)
  })
  it('ogni carta è unica', () => {
    const deck = makeDeck()
    const keys = deck.map(c => `${c.oc}${c.os}${c.ic}${c.is}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(81)
  })
})

// ── Scoring ───────────────────────────────────────────────────────────────────

describe('calcScore', () => {
  it('ritorna 0 se la cella è vuota', () => {
    const { tot } = calcScore(0, 0, {}, t)
    expect(tot).toBe(0)
  })

  it('nessun punteggio con meno di 4 carte in linea', () => {
    const board: Board = {
      '0,0': { oc: 'B', os: 'C', ic: 'R', is: 'T' },
      '1,0': { oc: 'B', os: 'Q', ic: 'G', is: 'C' },
      '2,0': { oc: 'B', os: 'T', ic: 'R', is: 'Q' },
    }
    const { tot } = calcScore(0, 0, board, t)
    expect(tot).toBe(0)
  })

  it('linea di 4 con stesso colore esterno vale 4 punti', () => {
    const board: Board = {
      '-1,0': { oc: 'B', os: 'T', ic: 'G', is: 'T' },
      '0,0':  { oc: 'B', os: 'C', ic: 'R', is: 'Q' },
      '1,0':  { oc: 'B', os: 'Q', ic: 'G', is: 'C' },
      '2,0':  { oc: 'B', os: 'T', ic: 'R', is: 'T' },
    }
    const { tot, details } = calcScore(0, 0, board, t)
    expect(tot).toBe(4)
    expect(details).toHaveLength(1)
  })

  it('linea di 5 vale 5 punti', () => {
    const board: Board = {
      '-2,0': { oc: 'R', os: 'T', ic: 'G', is: 'T' },
      '-1,0': { oc: 'R', os: 'C', ic: 'G', is: 'Q' },
      '0,0':  { oc: 'R', os: 'Q', ic: 'G', is: 'C' },
      '1,0':  { oc: 'R', os: 'T', ic: 'G', is: 'T' },
      '2,0':  { oc: 'R', os: 'C', ic: 'G', is: 'Q' },
    }
    // colore oc: R × 5 = 5pt; colore ic: G × 5 = 5pt
    const { tot } = calcScore(0, 0, board, t)
    expect(tot).toBe(10) // 5 + 5
  })
})

describe('buildLine / subLineLen', () => {
  it('buildLine raccoglie tutte le celle contigue in una direzione', () => {
    const board: Board = {
      '0,0': { oc: 'B', os: 'C', ic: 'R', is: 'T' },
      '1,0': { oc: 'R', os: 'Q', ic: 'G', is: 'C' },
      '2,0': { oc: 'G', os: 'T', ic: 'B', is: 'Q' },
    }
    const line = buildLine(1, 0, 1, 0, board)
    expect(line).toHaveLength(3)
    expect(line[0]).toEqual({ q: 0, r: 0 })
    expect(line[2]).toEqual({ q: 2, r: 0 })
  })

  it('subLineLen conta la lunghezza del segmento con stesso attributo', () => {
    const cards = [
      { oc: 'B', os: 'C', ic: 'R', is: 'T' },
      { oc: 'B', os: 'Q', ic: 'G', is: 'C' },
      { oc: 'B', os: 'T', ic: 'R', is: 'T' },
      { oc: 'R', os: 'C', ic: 'G', is: 'Q' },
    ] as const
    // All prime 3 hanno oc:'B', idx=1 → lunghezza segmento = 3
    expect(subLineLen([...cards], 1, 'oc')).toBe(3)
    // Il quarto ha oc:'R' → lunghezza = 1
    expect(subLineLen([...cards], 3, 'oc')).toBe(1)
  })
})

// ── Meeple & withdraw ─────────────────────────────────────────────────────────

describe('doWithdraw', () => {
  function makeTestState(): GameState {
    const g = makeGame(2)
    // Piazza 4 carte in linea con colore oc:'B' per avere 4pt
    g.board['-1,0'] = { oc: 'B', os: 'T', ic: 'G', is: 'T' }
    g.board['0,0']  = { oc: 'B', os: 'C', ic: 'R', is: 'Q' }
    g.board['1,0']  = { oc: 'B', os: 'Q', ic: 'G', is: 'C' }
    g.board['2,0']  = { oc: 'B', os: 'T', ic: 'R', is: 'T' }
    g.meeples['0,0'] = 0  // meeple del giocatore 0 in (0,0)
    g.tokens[0] = 1
    return g
  }

  function makeConqNoPointsState(): GameState {
    const g = makeGame(2)
    // Carta isolata (nessuna linea di 4) → 0 punti al ritiro
    g.board['0,0'] = { oc: 'B', os: 'C', ic: 'R', is: 'Q' }
    g.meeples['0,0'] = 0
    g.conquered['0,0'] = true
    g.tokens[0] = 1
    return g
  }

  it('aggiunge i punti al punteggio del giocatore', () => {
    const g = makeTestState()
    const { pts } = doWithdraw(g, 0, '0,0', t)
    expect(pts).toBe(4)
    expect(g.scores[0]).toBe(4)
  })

  it('rimuove il meeple dalla plancia', () => {
    const g = makeTestState()
    doWithdraw(g, 0, '0,0', t)
    expect(g.meeples['0,0']).toBeUndefined()
  })

  it('restituisce il token al giocatore', () => {
    const g = makeTestState()
    doWithdraw(g, 0, '0,0', t)
    expect(g.tokens[0]).toBe(2)
  })

  it('non mette gameOver se il punteggio è < 50', () => {
    const g = makeTestState()
    doWithdraw(g, 0, '0,0', t)
    expect(g.gameOver).toBe(false)
  })

  it('mette gameOver se si raggiunge 50 punti', () => {
    const g = makeTestState()
    g.scores[0] = 46  // 46 + 4 = 50 → gameOver
    doWithdraw(g, 0, '0,0', t)
    expect(g.gameOver).toBe(true)
  })

  it('carta conquistata senza punti: la carta viene comunque bruciata', () => {
    const g = makeConqNoPointsState()
    const { pts, burnCells } = doWithdraw(g, 0, '0,0', t)
    expect(pts).toBe(0)
    // Con 0 punti brucia almeno la carta conquistata stessa…
    expect(burnCells).toContain('0,0')
    // …che viene rimossa dalla plancia e dal set delle conquistate
    expect(g.board['0,0']).toBeUndefined()
    expect(g.conquered['0,0']).toBeUndefined()
    // e finisce negli scarti
    expect(g.discard.length).toBe(1)
  })
})

describe('getBurnCells', () => {
  it('una cella conquistata brucia anche le adiacenti che contribuiscono al punteggio', () => {
    const board: Board = {
      '-1,0': { oc: 'B', os: 'T', ic: 'G', is: 'T' },
      '0,0':  { oc: 'B', os: 'C', ic: 'R', is: 'Q' },
      '1,0':  { oc: 'B', os: 'Q', ic: 'G', is: 'C' },
      '2,0':  { oc: 'B', os: 'T', ic: 'R', is: 'T' },
    }
    const burned = getBurnCells(0, 0, board, {})
    expect(burned.has('0,0')).toBe(true)
  })
})

// ── Game factory ──────────────────────────────────────────────────────────────

describe('makeGame', () => {
  it('crea una partita con il numero corretto di giocatori', () => {
    for (const n of [2, 3, 4] as const) {
      const g = makeGame(n)
      expect(g.numPlayers).toBe(n)
      expect(g.scores).toHaveLength(n)
      expect(g.tokens).toHaveLength(n)
      expect(g.hands).toHaveLength(n)
    }
  })

  it('ogni giocatore parte con 3 carte e 2 token', () => {
    const g = makeGame(2)
    expect(g.hands[0]).toHaveLength(3)
    expect(g.hands[1]).toHaveLength(3)
    expect(g.tokens[0]).toBe(2)
    expect(g.tokens[1]).toBe(2)
  })

  it('piazza 7 carte iniziali sulla plancia', () => {
    const g = makeGame(2)
    expect(Object.keys(g.board)).toHaveLength(7)
  })

  it('tutti i punteggi partono da 0', () => {
    const g = makeGame(3)
    expect(g.scores.every(s => s === 0)).toBe(true)
  })
})

describe('cloneGame', () => {
  it('modificare il clone non altera l\'originale', () => {
    const g = makeGame(2)
    const clone = cloneGame(g)
    clone.scores[0] = 99
    clone.board['0,0'] = { oc: 'R', os: 'T', ic: 'G', is: 'Q' }
    clone.hands[0].push({ oc: 'B', os: 'C', ic: 'R', is: 'T' })
    expect(g.scores[0]).toBe(0)
    expect(g.hands[0]).toHaveLength(3)
  })
})

describe('replenishHand', () => {
  it('riporta la mano a 3 carte pescando dal mazzo', () => {
    const g = makeGame(2)
    g.hands[0] = []  // svuota mano
    const deckSizeBefore = g.deck.length
    replenishHand(g, 0)
    expect(g.hands[0]).toHaveLength(3)
    expect(g.deck.length).toBe(deckSizeBefore - 3)
  })

  it('non pesca se il mazzo è vuoto', () => {
    const g = makeGame(2)
    g.deck = []
    g.hands[0] = []
    replenishHand(g, 0)
    expect(g.hands[0]).toHaveLength(0)
  })
})

describe('regola pedina: solo sulla tessera appena giocata (bot hard)', () => {
  // Caso mirato che riproduce il bug: una linea preesistente di 3 tessere
  // condivide il colore esterno R → la sua cella centrale ha alto "potenziale".
  // Il vecchio codice del bot hard ci posava la pedina, violando la regola.
  it('non posiziona la pedina su una tessera preesistente ad alto potenziale', () => {
    const board: Board = {
      '-1,0': { os: 'T', oc: 'B', is: 'T', ic: 'B' }, // tappo: spezza la run di R
      '0,0':  { os: 'T', oc: 'R', is: 'T', ic: 'B' }, // ┐
      '1,0':  { os: 'Q', oc: 'R', is: 'Q', ic: 'G' }, // ├ run di 3 con oc=R (potenziale +3)
      '2,0':  { os: 'C', oc: 'R', is: 'C', ic: 'B' }, // ┘
      '3,0':  { os: 'C', oc: 'B', is: 'C', ic: 'G' }, // tappo: spezza la run di R
      '0,3':  { os: 'T', oc: 'B', is: 'T', ic: 'G' }, // tessera isolata lontana
    }
    // Carta in mano: condivide <2 tratti con OGNI tessera → nessuna conquista possibile,
    // quindi il bot la posa su una cella vuota.
    const hand: Card = { os: 'Q', oc: 'G', is: 'C', ic: 'R' }
    const g: GameState = {
      numPlayers: 2, deck: [], discard: [],
      scores: [0, 0], hands: [[], [hand]], tokens: [2, 2],
      board, conquered: {}, meeples: {},
      turn: 1, phase: 'place', selIdx: -1, log: [], placedPos: null, gameOver: false,
    }
    const idx = 1
    const boardKeysBefore = new Set(Object.keys(g.board))

    runCpuTurn(g, idx, t, 'hard')

    // Le tessere preesistenti della run NON devono avere la pedina del bot
    for (const k of ['0,0', '1,0', '2,0']) expect(g.meeples[k]).toBeUndefined()

    // Ogni pedina del bot deve stare su una cella che PRIMA era vuota (la tessera giocata)
    for (const [k, owner] of Object.entries(g.meeples)) {
      if (owner !== idx) continue
      expect(boardKeysBefore.has(k)).toBe(false)
    }

    // Il bot ha comunque posato esattamente una pedina in questo turno
    expect(Object.values(g.meeples).filter(v => v === idx)).toHaveLength(1)
  })

  // Test di proprietà: simula partite complete e verifica l'invariante a ogni turno.
  it('su 40 partite simulate ogni pedina nuova finisce solo sulla tessera giocata', () => {
    for (let game = 0; game < 40; game++) {
      const g = makeGame(3)
      for (let step = 0; step < 80 && !g.gameOver; step++) {
        const idx = g.turn
        const beforeCards: Board = { ...g.board }
        const beforeMeeples = { ...g.meeples }

        runCpuTurn(g, idx, t, 'hard')

        // Tessera/e "giocate" in questo turno: celle nuove o la cui carta è cambiata (conquista)
        const playedKeys = new Set<string>()
        for (const k of Object.keys(g.board)) {
          if (beforeCards[k] === undefined || beforeCards[k] !== g.board[k]) playedKeys.add(k)
        }

        for (const [k, owner] of Object.entries(g.meeples)) {
          if (owner !== idx) continue
          if (beforeMeeples[k] === idx) continue // pedina già presente da un turno precedente
          // una pedina nuova del bot DEVE stare sulla tessera appena giocata
          expect(playedKeys.has(k)).toBe(true)
        }

        g.turn = (idx + 1) % g.numPlayers
      }
    }
  })
})
