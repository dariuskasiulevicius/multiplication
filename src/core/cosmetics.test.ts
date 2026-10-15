import { describe, expect, it } from 'vitest'
import { buy, COSMETICS, openChest, toggleWear } from './cosmetics'
import { createKid } from './kid'
import { seeded } from './rng'

const kid = () =>
  createKid({ kidId: 'k1', name: 'Ema', deviceId: 'd', lang: 'en', theme: 'pets', sync: null, now: new Date('2026-10-01') })

describe('Cosmetics', () => {
  it('buying spends Stars and puts the item on', () => {
    const k = kid()
    k.stars = 12
    expect(buy(k, 'hat-🎓')).toBe(true)
    expect(k.stars).toBe(0)
    expect(k.owned).toEqual(['hat-🎓'])
    expect(k.look.hat).toBe('hat-🎓')
  })

  it('cannot buy without enough Stars or twice', () => {
    const k = kid()
    k.stars = 4
    expect(buy(k, 'hat-🧢')).toBe(false)
    k.stars = 20
    expect(buy(k, 'hat-🧢')).toBe(true)
    expect(buy(k, 'hat-🧢')).toBe(false)
    expect(k.stars).toBe(15)
  })

  it('wears only owned items, one per slot, and takes them off again', () => {
    const k = kid()
    toggleWear(k, 'buddy-🐶')
    expect(k.look.buddy).toBeUndefined()
    k.owned.push('buddy-🐶', 'buddy-🐱')
    toggleWear(k, 'buddy-🐶')
    toggleWear(k, 'buddy-🐱')
    expect(k.look.buddy).toBe('buddy-🐱')
    toggleWear(k, 'buddy-🐱')
    expect(k.look.buddy).toBeUndefined()
  })

  it('ids are unique', () => {
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length)
  })
})

describe('Mystery Chest', () => {
  it('gives 1–3 Stars or a cheap Cosmetic, and adds it to the Kid', () => {
    const k = kid()
    let stars = 0
    for (let seed = 1; seed <= 200; seed++) {
      const r = openChest(k, seeded(seed))
      if (r.kind === 'stars') {
        expect(r.n).toBeGreaterThanOrEqual(1)
        expect(r.n).toBeLessThanOrEqual(3)
        stars += r.n
      } else {
        expect(COSMETICS.find((c) => c.id === r.id)!.price).toBeLessThanOrEqual(12)
      }
    }
    expect(k.stars).toBe(stars)
    expect(new Set(k.owned).size).toBe(k.owned.length)
  })

  it('gives Stars once every cheap Cosmetic is owned', () => {
    const k = kid()
    k.owned = COSMETICS.map((c) => c.id)
    const rng = () => 0 // would pick a Cosmetic
    expect(openChest(k, rng)).toEqual({ kind: 'stars', n: 1 })
  })
})
