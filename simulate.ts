import { makeGame, cloneGame, replenishHand } from './src/game/logic'
import { runCpuTurn, type Difficulty } from './src/game/ai'

const T = {
  player1: 'P1', bot1: 'P2', bot2: 'P3', bot3: 'P4',
  shapeNames: { T: 'Triangle', Q: 'Square', C: 'Circle' },
  colorNames: { B: 'Blue', R: 'Red', G: 'Green' },
  attrLabels: { os: 'os', oc: 'oc', is: 'is', ic: 'ic' },
  diffLabels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
  difficulty: 'Difficulty',
} as any

const N = 2000
const MAX_TURNS = 600

function playMatchup(diffs: Difficulty[]): { wins: number[]; ties: number; scores: number[][] } {
  const n = diffs.length
  const wins = Array(n).fill(0)
  let ties = 0
  const scores: number[][] = Array.from({ length: n }, () => [])

  for (let i = 0; i < N; i++) {
    const g = makeGame(n)
    let turns = 0
    while (!g.gameOver && turns < MAX_TURNS) {
      runCpuTurn(g, g.turn, T, diffs[g.turn])
      if (!g.gameOver) {
        g.turn = (g.turn + 1) % n
        g.phase = 'place'; g.placedPos = null; g.selIdx = -1
      }
      turns++
    }
    if (turns >= MAX_TURNS) continue
    for (let p = 0; p < n; p++) scores[p].push(g.scores[p])
    const max = Math.max(...g.scores)
    const winners = g.scores.reduce<number[]>((a, s, j) => s === max ? [...a, j] : a, [])
    if (winners.length > 1) ties++
    else wins[winners[0]]++
  }
  return { wins, ties, scores }
}

function avg(arr: number[]) { return (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) }

function printMatchup(label: string, names: string[], diffs: Difficulty[]) {
  console.log(`\n${'═'.repeat(50)}`)
  console.log(`  ${label}`)
  console.log('═'.repeat(50))
  const { wins, ties, scores } = playMatchup(diffs)
  const total = wins.reduce((s, v) => s + v, 0) + ties
  names.forEach((name, i) => {
    const pct = (wins[i] / total * 100).toFixed(1)
    console.log(`  ${name.padEnd(20)} ${wins[i].toString().padStart(4)} vittorie  ${pct.padStart(5)}%  (media score: ${avg(scores[i])})`)
  })
  if (ties > 0) console.log(`  ${'Pareggi'.padEnd(20)} ${ties.toString().padStart(4)}`)
}

console.log(`\nFormidable — Benchmark difficoltà (${N} partite per matchup)\n`)

// 1v1 matchups
printMatchup('Easy vs Medium (2 giocatori)', ['😌 Easy', '🤔 Medium'], ['easy', 'medium'])
printMatchup('Easy vs Hard  (2 giocatori)', ['😌 Easy', '🔥 Hard'], ['easy', 'hard'])
printMatchup('Medium vs Hard (2 giocatori)', ['🤔 Medium', '🔥 Hard'], ['medium', 'hard'])

// 4-player free-for-all
printMatchup('Easy / Medium / Medium / Hard (4 giocatori)', ['😌 Easy', '🤔 Medium 1', '🤔 Medium 2', '🔥 Hard'], ['easy', 'medium', 'medium', 'hard'])

console.log()
