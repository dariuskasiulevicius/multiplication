import type { ISODate } from './types'

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): ISODate {
  return toISODate(new Date())
}

// Date math goes through UTC so DST shifts never skip or repeat a day.
function toUTC(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDays(date: ISODate, days: number): ISODate {
  const t = new Date(toUTC(date) + days * 86_400_000)
  return t.toISOString().slice(0, 10)
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86_400_000)
}
