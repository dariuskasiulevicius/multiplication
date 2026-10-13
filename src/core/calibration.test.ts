import { describe, expect, it } from 'vitest'
import { addTap, baseline, emptyCalibration, median, targetTime } from './calibration'

describe('calibration', () => {
  it('uses defaults before any Warm-up', () => {
    const cal = emptyCalibration()
    expect(baseline(cal, 1)).toBe(1200)
    expect(baseline(cal, 2)).toBe(1800)
  })

  it('takes the median per digit count', () => {
    const cal = emptyCalibration()
    for (const ms of [900, 1000, 5000]) addTap(cal, 1, ms)
    for (const ms of [1500, 1700]) addTap(cal, 2, ms)
    expect(baseline(cal, 1)).toBe(1000)
    expect(baseline(cal, 2)).toBe(1600)
  })

  it('keeps a rolling window of 30 taps', () => {
    const cal = emptyCalibration()
    for (let i = 0; i < 30; i++) addTap(cal, 1, 3000)
    for (let i = 0; i < 30; i++) addTap(cal, 1, 800)
    expect(cal.one).toHaveLength(30)
    expect(baseline(cal, 1)).toBe(800)
  })

  it('Target Time = Baseline + Recall Budget', () => {
    const cal = emptyCalibration()
    addTap(cal, 2, 1500)
    expect(targetTime(cal, 2, 4000)).toBe(5500)
  })

  it('median of even and empty lists', () => {
    expect(median([1, 3])).toBe(2)
    expect(median([])).toBeNull()
  })
})
