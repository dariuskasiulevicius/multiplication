// Sound effects synthesised with WebAudio, so there are no audio files to cache.

let ctx: AudioContext | null = null
let enabled = true

export function setSound(on: boolean): void {
  enabled = on
}

function audio(): AudioContext | null {
  if (!enabled) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, length: number, type: OscillatorType = 'sine', volume = 0.15): void {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + start
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

const C5 = 523.25
const E5 = 659.25
const G5 = 783.99
const C6 = 1046.5

export const sfx = {
  tap: () => tone(880, 0, 0.04, 'triangle', 0.05),
  correct: () => {
    tone(E5, 0, 0.12)
    tone(G5, 0.07, 0.15)
  },
  fast: () => {
    tone(G5, 0, 0.1, 'triangle')
    tone(C6, 0.06, 0.18, 'triangle')
  },
  /** Rising pitch as the combo grows. */
  combo: (n: number) => {
    const base = C5 * Math.pow(2, Math.min(n, 12) / 12)
    tone(base, 0, 0.08, 'square', 0.06)
    tone(base * 1.5, 0.06, 0.12, 'square', 0.06)
  },
  wrong: () => {
    tone(220, 0, 0.18, 'sawtooth', 0.06)
    tone(196, 0.12, 0.22, 'sawtooth', 0.05)
  },
  roundEnd: () => [C5, E5, G5, C6].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.12)),
  /** Little drum roll, then a bright chord: the Mystery Badge opens. */
  reveal: () => {
    for (let i = 0; i < 6; i++) tone(180 + i * 25, i * 0.05, 0.05, 'square', 0.04)
    ;[C5, E5, G5, C6].forEach((f) => tone(f, 0.34, 0.9, 'triangle', 0.1))
    tone(C6 * 2, 0.5, 0.5, 'sine', 0.06)
  },
  /** Coin clink: something bought in the Shop. */
  buy: () => {
    tone(1318.5, 0, 0.08, 'square', 0.05)
    tone(1975.5, 0.07, 0.25, 'triangle', 0.08)
  },
  dayDone: () => {
    ;[C5, E5, G5, C6, G5, C6].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.13))
    tone(C6 * 1.5, 0.7, 0.6, 'sine', 0.1)
  },
}

export function vibrate(pattern: number | number[]): void {
  if (enabled) navigator.vibrate?.(pattern)
}
