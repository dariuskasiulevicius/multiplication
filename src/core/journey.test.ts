import { describe, expect, it } from 'vitest'
import { earnPlayDay, gridCell, isWorldEnd, newJourney, phaseOf, viewStreak, worldOf, worldRange } from './journey'

describe('Journey Grid', () => {
  it('fills the 7 × 7 square, then rings to 10 × 10, each cell once', () => {
    const cells = new Set<string>()
    for (let d = 1; d <= 100; d++) {
      const { row, col } = gridCell(d)
      expect(row).toBeGreaterThanOrEqual(1)
      expect(col).toBeLessThanOrEqual(10)
      cells.add(`${row},${col}`)
      if (d <= 49) expect(Math.max(row, col)).toBeLessThanOrEqual(7)
    }
    expect(cells.size).toBe(100)
    expect(gridCell(49)).toEqual({ row: 7, col: 7 })
    expect(gridCell(50)).toEqual({ row: 1, col: 8 })
    expect(gridCell(64)).toEqual({ row: 8, col: 1 })
    expect(gridCell(100)).toEqual({ row: 10, col: 1 })
  })

  it('maps Play Days to Worlds and phases', () => {
    expect(worldOf(1)).toBe(1)
    expect(worldOf(7)).toBe(1)
    expect(worldOf(8)).toBe(2)
    expect(worldOf(49)).toBe(7)
    expect(worldOf(50)).toBe(8)
    expect(worldOf(81)).toBe(9)
    expect(worldOf(100)).toBe(10)
    expect(worldOf(101)).toBeNull()
    expect(worldRange(8)).toEqual([50, 64])
    expect(worldRange(10)).toEqual([82, 100])
    expect([7, 49, 64, 81, 100].every(isWorldEnd)).toBe(true)
    expect(phaseOf(49)).toBe('challenge')
    expect(phaseOf(50)).toBe('legend')
    expect(phaseOf(101)).toBe('free')
  })
})

describe('Streak and Shields', () => {
  it('counts consecutive Play Days', () => {
    const j = newJourney()
    earnPlayDay(j, '2026-10-01')
    earnPlayDay(j, '2026-10-02')
    expect(j.streak).toBe(2)
    expect(earnPlayDay(j, '2026-10-02')).toBeNull()
  })

  it('a Shield covers a missed day and the Streak keeps counting it', () => {
    const j = newJourney()
    earnPlayDay(j, '2026-10-01')
    const e = earnPlayDay(j, '2026-10-03')!
    expect(e.shieldsUsed).toEqual(['2026-10-02'])
    expect(j.shields).toBe(0)
    expect(j.streak).toBe(3)
    expect(e.playDay).toBe(2)
  })

  it('a gap longer than the Shields resets the Streak and keeps the Shields', () => {
    const j = newJourney()
    earnPlayDay(j, '2026-10-01')
    const e = earnPlayDay(j, '2026-10-05')!
    expect(e.streakReset).toBe(true)
    expect(j.streak).toBe(1)
    expect(j.shields).toBe(1)
    expect(j.playDays).toHaveLength(2)
  })

  it('earns a Shield per completed World, holding at most 2', () => {
    const j = newJourney()
    const days = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
    const events = days.map((d) => earnPlayDay(j, d)!)
    expect(events[6]).toMatchObject({ worldCompleted: 1, shieldEarned: true })
    expect(j.shields).toBe(2)
    expect(events[13]).toMatchObject({ worldCompleted: 2, shieldEarned: false })
  })

  it('shows the Streak before today is played', () => {
    const j = newJourney()
    expect(viewStreak(j, '2026-10-01')).toMatchObject({ streak: 0, broken: false })
    earnPlayDay(j, '2026-10-01')
    expect(viewStreak(j, '2026-10-01')).toMatchObject({ streak: 1, playedToday: true })
    expect(viewStreak(j, '2026-10-02')).toMatchObject({ streak: 1, shieldsNeeded: 0 })
    expect(viewStreak(j, '2026-10-03')).toMatchObject({ streak: 1, shieldsNeeded: 1 })
    expect(viewStreak(j, '2026-10-04')).toMatchObject({ streak: 0, broken: true })
  })
})
