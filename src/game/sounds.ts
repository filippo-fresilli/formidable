// ── Web Audio sound engine ────────────────────────────────────────────────────
// All sounds are synthesized via the Web Audio API — no files needed.

export type SoundName = 'select' | 'place' | 'conquer' | 'meeple' | 'withdraw' | 'win' | 'undo'

let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

// Play a single tone: frequency sweep + gain envelope
function tone(
  c: AudioContext,
  freq: number,
  endFreq: number,
  duration: number,
  volume: number,
  delaySeconds = 0,
  type: OscillatorType = 'sine',
) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.connect(gain)
  gain.connect(c.destination)

  const t = c.currentTime + delaySeconds
  osc.frequency.setValueAtTime(freq, t)
  if (endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration * 0.75)
  }
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

// ── Individual sounds ─────────────────────────────────────────────────────────

function playSelect() {
  const c = getCtx()
  tone(c, 900, 1100, 0.07, 0.12)
}

function playPlace() {
  const c = getCtx()
  tone(c, 280, 160, 0.14, 0.22, 0, 'triangle')
}

function playConquer() {
  const c = getCtx()
  tone(c, 160, 80,  0.28, 0.28, 0,    'sawtooth')
  tone(c, 320, 160, 0.22, 0.14, 0.04, 'square')
  tone(c, 500, 300, 0.18, 0.10, 0.08, 'sine')
}

function playMeeple() {
  const c = getCtx()
  tone(c, 700, 1000, 0.07, 0.18)
}

function playWithdraw() {
  // Ascending C–E–G arpeggio (C5, E5, G5)
  const c = getCtx()
  tone(c, 523, 523, 0.12, 0.22, 0.00)
  tone(c, 659, 659, 0.12, 0.22, 0.09)
  tone(c, 784, 784, 0.18, 0.28, 0.18)
}

function playWin() {
  // C5 → E5 → G5 → C6 fanfare
  const c = getCtx()
  tone(c, 523,  523,  0.12, 0.30, 0.00)
  tone(c, 659,  659,  0.12, 0.30, 0.12)
  tone(c, 784,  784,  0.12, 0.30, 0.24)
  tone(c, 1047, 1047, 0.40, 0.35, 0.36)
  // harmony
  tone(c, 784,  784,  0.40, 0.18, 0.36)
}

function playUndo() {
  const c = getCtx()
  tone(c, 550, 380, 0.10, 0.14)
}

// ── Public API ────────────────────────────────────────────────────────────────

const SOUNDS: Record<SoundName, () => void> = {
  select:   playSelect,
  place:    playPlace,
  conquer:  playConquer,
  meeple:   playMeeple,
  withdraw: playWithdraw,
  win:      playWin,
  undo:     playUndo,
}

export function playSound(name: SoundName, muted: boolean): void {
  if (muted) return
  try {
    SOUNDS[name]()
  } catch {
    // AudioContext unavailable (e.g. server-side render or blocked)
  }
}
