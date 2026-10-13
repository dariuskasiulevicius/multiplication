import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, toISODate } from './dates'

describe('dates', () => {
  it('formats local dates', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('adds days across months, years and DST changes', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-10-13', '2026-10-13')).toBe(0)
    expect(daysBetween('2026-10-13', '2026-10-16')).toBe(3)
    expect(daysBetween('2026-10-16', '2026-10-13')).toBe(-3)
  })
})
