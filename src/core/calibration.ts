import type { Calibration } from './types'

const SAMPLES = 30
const DEFAULT_MS = { one: 1200, two: 1800 }

export function emptyCalibration(): Calibration {
  return { one: [], two: [] }
}

function bucket(digitCount: number): 'one' | 'two' {
  return digitCount <= 1 ? 'one' : 'two'
}

/** Record one Warm-up tap; keeps a rolling window. */
export function addTap(cal: Calibration, digitCount: number, ms: number): void {
  const list = cal[bucket(digitCount)]
  list.push(Math.min(8000, Math.max(200, Math.round(ms))))
  if (list.length > SAMPLES) list.splice(0, list.length - SAMPLES)
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((x, y) => x - y)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export function baseline(cal: Calibration, digitCount: number): number {
  const b = bucket(digitCount)
  return median(cal[b]) ?? DEFAULT_MS[b]
}

/** Target Time = Baseline for the answer's digit count + a Recall Budget. */
export function targetTime(cal: Calibration, digitCount: number, budgetMs: number): number {
  return baseline(cal, digitCount) + budgetMs
}
