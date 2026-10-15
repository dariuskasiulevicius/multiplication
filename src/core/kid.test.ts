import { describe, expect, it } from 'vitest'
import { lessonFacts, LESSONS } from './facts'
import {
  ceremonyFor,
  completeRound,
  createKid,
  DAILY_CAP_MS,
  finishPlacement,
  finishTrial,
  introduceLesson,
  journeyStats,
  lastCompletedWorld,
  markRevealed,
  migrateKid,
  nextRound,
  pendingReveal,
  playDayNumber,
  recordAnswer,
  targetsFor,
  trialRetry,
  trialStars,
  trialWorldFor,
  worldFacts,
} from './kid'
import type { KidState } from './types'

const D1 = '2026-10-01'
const now = new Date('2026-10-01T16:00:00Z')

function kid(sync = true): KidState {
  return createKid({
    kidId: 'k1',
    name: 'Ema',
    deviceId: 'dev1',
    lang: 'lt',
    theme: 'unicorn',
    sync: sync ? { url: 'https://script.example', secret: 's' } : null,
    now,
  })
}

const round = (k: KidState, kind: Parameters<typeof completeRound>[1]['kind'], core = true, playMs = 60_000) =>
  completeRound(k, { kind, core, playMs, roundMs: playMs, date: D1 })

describe('a Play Day', () => {
  it('Play Day 1 is the Placement Quiz plus two Rounds', () => {
    const k = kid()
    expect(nextRound(k, D1)).toMatchObject({ kind: 'placement', core: true, index: 1, total: 3 })
    finishPlacement(k, [1], D1)
    round(k, 'placement')
    expect(nextRound(k, D1)?.kind).toBe('new')
    round(k, 'new')
    const r = round(k, 'mixed')
    expect(r.earned).toMatchObject({ playDay: 1 })
    expect(playDayNumber(k, D1)).toBe(1)
    expect(nextRound(k, D1)).toMatchObject({ kind: 'bonus', core: false })
  })

  it('peeking at the next Round does not start the day (safe in derived UI state)', () => {
    const k = kid()
    nextRound(k, D1)
    expect(k.day).toBeNull()
  })

  it('keeps the day plan fixed even after placement finishes', () => {
    const k = kid()
    finishPlacement(k, [], D1)
    expect(k.day!.plan).toEqual(['placement', 'new', 'mixed'])
  })

  it('reaching the Daily Cap earns the Play Day and then stops Bonus Rounds', () => {
    const k = kid()
    finishPlacement(k, [], D1)
    const r = round(k, 'placement', true, DAILY_CAP_MS)
    expect(r.earned).not.toBeNull()
    expect(r.capReached).toBe(true)
    expect(nextRound(k, D1)).toBeNull()
  })

  it('splits Core Rounds over Sessions on the same day and starts fresh tomorrow', () => {
    const k = kid()
    finishPlacement(k, [], D1)
    round(k, 'placement')
    expect(nextRound(k, D1)?.index).toBe(2)
    expect(nextRound(k, '2026-10-02')).toMatchObject({ kind: 'new', index: 1, total: 5 })
  })
})

describe('answers', () => {
  it('records answers with Baseline and Target Time and cuts Batches per Round', () => {
    const k = kid()
    introduceLesson(k, LESSONS[0], D1)
    const { outcome, targets } = recordAnswer(k, { a: 1, b: 7, given: 7, ms: 1500, round: 'new', date: D1, now })
    expect(outcome).toMatchObject({ correct: true, fast: true, tierAfter: 'silver' })
    expect(targets).toEqual({ baselineMs: 1200, targetMs: 11_200, legendTargetMs: 7200 })
    expect(k.outbox[0]).toMatchObject({ a: 1, b: 7, given: 7, baselineMs: 1200, fast: true })
    round(k, 'new')
    expect(k.outbox).toEqual([])
    expect(k.pending).toHaveLength(1)
    expect(k.pending[0].answers).toHaveLength(1)
    expect(k.day!.newFacts).toBe(lessonFacts(LESSONS[0]).length)
  })

  it('a Kid without a Family Sheet keeps history but no Batches', () => {
    const k = kid(false)
    recordAnswer(k, { a: 2, b: 3, given: 5, ms: 1500, round: 'review', date: D1, now })
    round(k, 'review')
    expect(k.pending).toEqual([])
    expect(k.history[0]).toMatchObject({ date: D1, questions: 1, correct: 0 })
  })

  it('judges speed by the Legend Recall Budget during Legend', () => {
    const k = kid()
    k.journey.playDays = Array.from({ length: 49 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`)
    expect(targetsFor(k, D1, 42).targetMs).toBe(1800 + 6000)
  })

  it('remembers the best Speed Round', () => {
    const k = kid()
    expect(completeRound(k, { kind: 'speed', core: true, playMs: 1, roundMs: 30_000, date: D1 }).newBest).toBe(false)
    expect(completeRound(k, { kind: 'speed', core: true, playMs: 1, roundMs: 25_000, date: D1 }).newBest).toBe(true)
    expect(k.bestSpeedRoundMs).toBe(25_000)
  })
})

/** A Kid who has earned `n` Play Days, the last one yesterday. */
function playedDays(n: number): KidState {
  const k = kid()
  k.placementDone = true
  const start = new Date('2026-06-01T12:00:00Z')
  k.journey.playDays = Array.from({ length: n }, (_, i) => new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10))
  k.journey.playDays.push('2026-09-30')
  k.journey.playDays = k.journey.playDays.slice(-n)
  return k
}

describe('Speed Trials', () => {
  it("a World's last Play Day ends with its Speed Trial", () => {
    const k = playedDays(6)
    expect(playDayNumber(k, D1)).toBe(7)
    expect(nextRound(k, D1)).toMatchObject({ kind: 'review', total: 4 })
    expect(trialWorldFor(k, D1)).toBe(1)
    const l = playedDays(63)
    expect(nextRound(l, D1)).toMatchObject({ kind: 'weak', total: 2 })
    expect(trialWorldFor(l, D1)).toBe(8)
    expect(nextRound(playedDays(5), D1)?.total).toBe(5)
  })

  it('finishing the Speed Trial earns the Play Day, the World and a Mystery Chest', () => {
    const k = playedDays(6)
    for (const kind of ['review', 'new', 'mixed'] as const) round(k, kind)
    const r = round(k, 'trial')
    expect(r.earned).toMatchObject({ playDay: 7, worldCompleted: 1 })
    expect(r.chest).not.toBeNull()
  })

  it('scores 1–3 Stars at 50 / 75 / 90 % Fast Answers', () => {
    expect([9, 10, 14, 15, 17, 18, 20].map((f) => trialStars(f, 20))).toEqual([0, 1, 1, 2, 2, 3, 3])
  })

  it('only beating the best attempt earns more Stars', () => {
    const k = kid()
    expect(finishTrial(k, 1, 15, 20)).toMatchObject({ stars: 2, gained: 2 })
    expect(finishTrial(k, 1, 10, 20)).toMatchObject({ stars: 1, gained: 0 })
    expect(k.trials[1]).toEqual({ stars: 2, fast: 15, total: 20, tries: 2 })
    expect(finishTrial(k, 1, 19, 20)).toMatchObject({ stars: 3, gained: 1 })
    expect(k.stars).toBe(3)
  })

  it('can be retried in Bonus time until it has 3 Stars', () => {
    const k = playedDays(7)
    expect(lastCompletedWorld(k)).toBe(1)
    expect(trialRetry(k, D1)).toBeNull() // today's Core Rounds come first
    for (const kind of ['review', 'new', 'mixed', 'speed', 'weak'] as const) round(k, kind)
    expect(trialRetry(k, D1)).toBe(1)
    finishTrial(k, 1, 20, 20)
    expect(trialRetry(k, D1)).toBeNull()
    expect(trialRetry(playedDays(6), D1)).toBeNull()
  })

  it("picks the World's own Facts by the Play Day they were Introduced on", () => {
    const k = kid()
    introduceLesson(k, LESSONS[0], D1)
    expect(worldFacts(k, 1).sort()).toEqual(lessonFacts(LESSONS[0]).sort())
    k.journey.playDays = playedDays(7).journey.playDays
    introduceLesson(k, LESSONS[1], '2026-10-02')
    expect(worldFacts(k, 2).sort()).toEqual(lessonFacts(LESSONS[1]).filter((id) => !lessonFacts(LESSONS[0]).includes(id)).sort())
  })
})

describe('Mystery Chest', () => {
  it('comes with every earned Play Day', () => {
    const k = kid()
    finishPlacement(k, [], D1)
    round(k, 'placement')
    expect(round(k, 'new').chest).toBeNull()
    const r = completeRound(k, { kind: 'mixed', core: true, playMs: 1, roundMs: 1, date: D1 }, () => 0.5)
    expect(r.chest).toEqual({ kind: 'stars', n: 2 })
    expect(k.stars).toBe(2)
  })
})

describe('migrateKid', () => {
  it('gives progress from before Stars empty rewards and dates its Introduced Facts', () => {
    const k = kid() as Partial<KidState> & KidState
    delete (k as Partial<KidState>).stars
    delete (k as Partial<KidState>).owned
    delete (k as Partial<KidState>).look
    delete (k as Partial<KidState>).trials
    k.facts['2x3'].introduced = true
    k.journey.playDays = ['2026-09-29', '2026-09-30']
    const m = migrateKid(k)
    expect(m).toMatchObject({ stars: 0, owned: [], look: {}, trials: {} })
    expect(m.facts['2x3'].introducedDay).toBe(2)
    expect(m.facts['2x4'].introducedDay).toBeUndefined()
  })

  it('moves Kids on the first release defaults to the current Recall Budgets', () => {
    const k = kid()
    k.settings.recallBudgetMs = 4000
    k.settings.legendRecallBudgetMs = 3000
    expect(migrateKid(k).settings).toMatchObject({ recallBudgetMs: 10_000, legendRecallBudgetMs: 6000 })
  })

  it('keeps a budget the Parent chose', () => {
    const k = kid()
    k.settings.recallBudgetMs = 4000
    k.settings.legendRecallBudgetMs = 2500
    expect(migrateKid(k).settings).toMatchObject({ recallBudgetMs: 4000, legendRecallBudgetMs: 2500 })
  })
})

describe('celebrations', () => {
  it('a World Badge reveal stays pending until seen', () => {
    const k = playedDays(6)
    expect(pendingReveal(k)).toBeNull()
    for (const kind of ['review', 'new', 'mixed', 'trial'] as const) round(k, kind)
    expect(pendingReveal(k)).toBe(1)
    markRevealed(k, 1)
    expect(pendingReveal(k)).toBeNull()
  })

  it('progress from before reveals were tracked does not replay old ones', () => {
    const k = playedDays(15)
    delete (k as Partial<KidState>).revealedWorld
    expect(migrateKid(k).revealedWorld).toBe(2)
    expect(pendingReveal(k)).toBeNull()
  })

  it('finishing the Challenge and Legend get a ceremony', () => {
    expect([1, 6, 7, 8, 9, 10].map(ceremonyFor)).toEqual([null, null, 'challenge', null, null, 'legend'])
  })

  it('sums up the journey for the ceremony', () => {
    const k = playedDays(49)
    k.facts['2x3'].tier = 'gold'
    k.facts['3x2'].tier = 'diamond'
    k.trials = { 1: { stars: 3, fast: 20, total: 20, tries: 1 }, 2: { stars: 2, fast: 16, total: 20, tries: 1 } }
    expect(journeyStats(k)).toMatchObject({ playDays: 49, gold: 2, diamond: 1, trialStars: 5 })
  })
})
