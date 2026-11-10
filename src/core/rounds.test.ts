import { describe, expect, it } from 'vitest'
import { factId, initialFacts, lessonFacts, LESSONS } from './facts'
import { introduce } from './mastery'
import { seeded } from './rng'
import { buildRound, choiceOptions, ROUND_SIZE, RoundRunner, SMALL_LESSON_ABOVE, TRIAL_SIZE, type RoundItem } from './rounds'

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

  it('a Speed Trial has 20 questions, about half from its World', () => {
    const facts = initialFacts()
    for (const l of LESSONS.slice(0, 4)) for (const id of lessonFacts(l)) introduce(facts[id], '2026-10-01')
    const world = lessonFacts(LESSONS[3])
    const q = ids(buildRound('trial', { ...ctx(facts), worldFacts: world }).items)
    expect(q).toHaveLength(TRIAL_SIZE)
    const own = q.filter((id) => world.includes(id)).length
    expect(own).toBeGreaterThanOrEqual(Math.min(world.length, TRIAL_SIZE / 2))
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

  it('keeps teaching new Facts after many recent misses', () => {
    const facts = initialFacts()
    for (const l of LESSONS.slice(0, 2)) {
      for (const id of lessonFacts(l)) {
        introduce(facts[id], '2026-10-01')
        facts[id].lastWrong = '2026-10-05'
      }
    }
    const r = buildRound('new', ctx(facts))
    expect(r.kind).toBe('new')
    expect(r.lesson).toBe(LESSONS[2])
  })

  it('teaches one Fact Pair when more than 15% of recent answers were missed', () => {
    const facts = initialFacts()
    for (const l of LESSONS.slice(0, 2)) for (const id of lessonFacts(l)) introduce(facts[id], '2026-10-01')
    expect(buildRound('new', { ...ctx(facts), recentMissRate: SMALL_LESSON_ABOVE }).lesson).toBe(LESSONS[2])

    const r = buildRound('new', { ...ctx(facts), recentMissRate: 0.2 })
    expect(r.lesson?.pairs).toEqual([LESSONS[2].pairs[0]])
    expect(r.items.filter((i) => i.type === 'intro')).toHaveLength(1)
    expect(ids(r.items)).toHaveLength(ROUND_SIZE)
  })

  it('the one Fact Pair is the first still to teach', () => {
    const facts = initialFacts()
    for (const l of LESSONS.slice(0, 2)) for (const id of lessonFacts(l)) introduce(facts[id], '2026-10-01')
    const [first, second] = LESSONS[2].pairs
    introduce(facts[factId(first.a, first.b)], '2026-10-01')
    introduce(facts[factId(first.b, first.a)], '2026-10-01')
    expect(buildRound('new', { ...ctx(facts), recentMissRate: 0.5 }).lesson?.pairs).toEqual([second])
  })

  it('a rule lesson stays whole even after many misses', () => {
    expect(buildRound('new', { ...ctx(), recentMissRate: 0.5 }).lesson).toBe(LESSONS[0])
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

  it('a Speed Trial asks every question once', () => {
    const r = new RoundRunner([1, 2, 3].map((b) => ({ type: 'typed', a: 4, b }) as RoundItem), false)
    while (!r.done) r.answer({ correct: false, fast: false })
    expect(r.answered).toBe(3)
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

describe('Round Size', () => {
  const facts = () => {
    const f = initialFacts()
    for (const l of LESSONS.slice(0, 3)) for (const id of lessonFacts(l)) introduce(f[id], '2026-10-01')
    return f
  }

  it('review, mixed, weak and New Facts Rounds take the day\'s size', () => {
    for (const kind of ['review', 'mixed', 'weak', 'new'] as const) {
      expect(ids(buildRound(kind, { ...ctx(facts()), roundSize: 26 }).items)).toHaveLength(26)
    }
  })

  it('Speed and Bonus Rounds stay 10, a Speed Trial 20', () => {
    const c = { ...ctx(facts()), roundSize: 26 }
    expect(ids(buildRound('speed', c).items)).toHaveLength(ROUND_SIZE)
    expect(ids(buildRound('bonus', c).items)).toHaveLength(ROUND_SIZE)
    expect(ids(buildRound('trial', c).items)).toHaveLength(TRIAL_SIZE)
  })
})
