import { describe, expect, it } from 'vitest'
import { initialFacts, newFact } from './facts'
import { applyAnswer, introduce, isDue, rankWeak } from './mastery'

const fast = (date: string) => ({ correct: true, ms: 2000, targetMs: 5000, legendTargetMs: 1500, date })
const blazing = (date: string) => ({ correct: true, ms: 1000, targetMs: 5000, legendTargetMs: 1500, date })
const slow = (date: string) => ({ correct: true, ms: 6000, targetMs: 5000, legendTargetMs: 1500, date })
const wrong = (date: string) => ({ correct: false, ms: 3000, targetMs: 5000, legendTargetMs: 1500, date })

describe('mastery', () => {
  it('Slow Answer is Bronze, first Fast Answer is Silver', () => {
    const f = newFact(7, 8)
    applyAnswer(f, slow('2026-10-01'))
    expect(f.tier).toBe('bronze')
    applyAnswer(f, fast('2026-10-01'))
    expect(f.tier).toBe('silver')
  })

  it('Gold needs Fast Answers on 3 different days', () => {
    const f = newFact(7, 8)
    for (let i = 0; i < 5; i++) applyAnswer(f, fast('2026-10-01'))
    expect(f.tier).toBe('silver')
    applyAnswer(f, fast('2026-10-02'))
    applyAnswer(f, fast('2026-10-03'))
    expect(f.tier).toBe('gold')
  })

  it('Diamond needs 3 days within Legend Target Time, even before Legend', () => {
    const f = newFact(7, 8)
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) applyAnswer(f, fast(d))
    expect(f.tier).toBe('gold')
    for (const d of ['2026-10-04', '2026-10-05', '2026-10-06']) applyAnswer(f, blazing(d))
    expect(f.tier).toBe('diamond')
  })

  it('a miss never lowers the Tier, it makes the Fact Dusty until the next Fast Answer', () => {
    const f = newFact(7, 7)
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) applyAnswer(f, fast(d))
    applyAnswer(f, wrong('2026-10-04'))
    expect(f.tier).toBe('gold')
    expect(f.dusty).toBe(true)
    applyAnswer(f, slow('2026-10-04'))
    expect(f.dusty).toBe(true)
    applyAnswer(f, fast('2026-10-05'))
    expect(f.dusty).toBe(false)
  })

  it('a wrong answer on an unseen Fact is not Dusty and does not introduce it', () => {
    const f = newFact(6, 9)
    applyAnswer(f, wrong('2026-10-01'))
    expect(f.dusty).toBe(false)
    expect(f.introduced).toBe(false)
  })

  it('raises the Leitner box at most once per day and resets it on a miss', () => {
    const f = newFact(3, 4)
    introduce(f, '2026-10-01')
    expect(isDue(f, '2026-10-01')).toBe(true)
    applyAnswer(f, fast('2026-10-01'))
    applyAnswer(f, fast('2026-10-01'))
    expect(f.box).toBe(1)
    expect(f.due).toBe('2026-10-02')
    applyAnswer(f, fast('2026-10-02'))
    expect(f.box).toBe(2)
    expect(f.due).toBe('2026-10-04')
    applyAnswer(f, wrong('2026-10-04'))
    expect(f.box).toBe(1)
    expect(f.due).toBe('2026-10-05')
  })

  it('ranks Weak Facts: recent miss, then Tier, then speed', () => {
    const facts = initialFacts()
    // 7×7: Gold but missed yesterday. 6×8: Silver and slow. 2×2: Silver and quick.
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) applyAnswer(facts['7x7'], fast(d))
    applyAnswer(facts['7x7'], wrong('2026-10-04'))
    applyAnswer(facts['6x8'], fast('2026-10-03'))
    applyAnswer(facts['6x8'], { ...slow('2026-10-04'), ms: 9000 })
    applyAnswer(facts['2x2'], fast('2026-10-04'))
    expect(rankWeak(facts, ['2026-10-04', '2026-10-05'])).toEqual(['7x7', '6x8', '2x2'])
  })
})
