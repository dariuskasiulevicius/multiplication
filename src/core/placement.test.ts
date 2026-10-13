import { describe, expect, it } from 'vitest'
import { Placement } from './placement'
import { seeded } from './rng'

describe('Placement Quiz', () => {
  it('asks 3 per family across all 10 families for a strong Kid', () => {
    const p = new Placement(seeded(7))
    while (p.current) {
      const [a, b] = p.current
      expect(a === p.families[p.family] || b === p.families[p.family]).toBe(true)
      p.submit(true)
    }
    expect(p.answers).toHaveLength(30)
    expect(p.knownFamilies).toHaveLength(10)
    expect(p.progress).toBe(1)
  })

  it('stops after two weak families for a beginner', () => {
    const p = new Placement(seeded(7))
    while (p.current) p.submit(false)
    expect(p.answers).toHaveLength(6)
    expect(p.knownFamilies).toEqual([])
  })

  it('a family with one miss is not fully known', () => {
    const p = new Placement(seeded(3))
    p.submit(true)
    p.submit(false)
    p.submit(true)
    expect(p.knownFamilies).toEqual([])
    expect(p.done).toBe(false)
  })
})
