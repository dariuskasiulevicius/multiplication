import { describe, expect, it } from 'vitest'
import { factId, initialFacts, lessonFacts, LESSONS } from './facts'
import { introduce } from './mastery'
import { seeded } from './rng'
import { buildRound, choiceOptions, ROUND_SIZE, RoundRunner, type RoundItem } from './rounds'

const ctx = (facts = initialFacts(), seed = 1) => ({ facts, date: '2026-10-05', recentDays: ['2026-10-05'], rng: seeded(seed) })

const ids = (items: RoundItem[]) =>
  items.filter((i): i is Extract<RoundItem, { type: 'typed' }> => i.type === 'typed').map((i) => factId(i.a, i.b))

describe('buildRound', () => {
  it('starts a fresh Kid with the ×1 rule lesson', () => {
    const r = buildRound('new', ctx())
    expect(r.lesson).toBe(LESSONS[0])
    expect(r.items[0]).toEqual({ type: 'rule', family: 1 })
    expect(ids(r.items)).toHaveLength(ROUND_SIZE)
    expect(ids(r.items).every((id) => id.split('x').includes('1'))).toBe(true)
  })

  it('introduces pair lessons with intro cards, each new Fact practiced twice', () => {
    const facts = initialFacts()
    for (const l of LESSONS.slice(0, 2)) for (const id of lessonFacts(l)) introduce(facts[id], '2026-10-01')
    const r = buildRound('new', ctx(facts))
    expect(r.lesson).toBe(LESSONS[2])
    const intros = r.items.filter((i) => i.type === 'intro')
    expect(intros).toHaveLength(LESSONS[2].pairs.length)
    const practiced = ids(r.items)
    for (const id of lessonFacts(LESSONS[2])) expect(practiced.filter((x) => x === id)).toHaveLength(2)
  })

  it('never asks the same Fact twice in a row', () => {
    const facts = initialFacts()
    introduce(facts['2x3'], '2026-10-01')
    introduce(facts['3x2'], '2026-10-01')
    for (let seed = 1; seed < 30; seed++) {
      const q = ids(buildRound('review', ctx(facts, seed)).items)
      for (let i = 1; i < q.length; i++) expect(q[i]).not.toBe(q[i - 1])
    }
  })

  it('reviews due Facts first', () => {
    const facts = initialFacts()
    for (const l of LESSONS.slice(0, 2)) for (const id of lessonFacts(l)) introduce(facts[id], '2026-10-01', 4)
    introduce(facts['6x7'], '2026-10-04', 1)
    expect(ids(buildRound('review', ctx(facts)).items)).toContain('6x7')
  })

  it('consolidates instead of adding new Facts after many recent misses', () => {
    const facts = initialFacts()
    for (const id of lessonFacts(LESSONS[0])) {
      introduce(facts[id], '2026-10-01')
      facts[id].lastWrong = '2026-10-05'
    }
    expect(buildRound('new', ctx(facts)).kind).toBe('weak')
  })
})

describe('choiceOptions', () => {
  it('gives 4 distinct positive options including the answer', () => {
    for (let seed = 1; seed < 20; seed++) {
      const o = choiceOptions(1, 1, seeded(seed))
      expect(o).toHaveLength(4)
      expect(new Set(o).size).toBe(4)
      expect(o).toContain(1)
      expect(o.every((n) => n > 0)).toBe(true)
    }
  })
})

describe('RoundRunner', () => {
  it('requeues a missed Fact once, 3 questions later', () => {
    const items: RoundItem[] = [1, 2, 3, 4, 5].map((b) => ({ type: 'typed', a: 2, b }))
    const r = new RoundRunner(items)
    r.answer({ correct: false, fast: false })
    expect(r.items[3]).toEqual({ type: 'typed', a: 2, b: 1, retry: true })
    while (!r.done) r.answer({ correct: false, fast: false })
    expect(r.items.filter((i) => i.type === 'typed' && i.b === 1)).toHaveLength(2)
  })

  it('counts combos of Fast Answers', () => {
    const r = new RoundRunner([1, 2, 3, 4].map((b) => ({ type: 'typed', a: 3, b }) as RoundItem))
    r.answer({ correct: true, fast: true })
    r.answer({ correct: true, fast: true })
    r.answer({ correct: true, fast: false })
    r.answer({ correct: true, fast: true })
    expect(r.bestCombo).toBe(2)
    expect(r.combo).toBe(1)
    expect(r.done).toBe(true)
  })
})
