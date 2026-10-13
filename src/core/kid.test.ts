import { describe, expect, it } from 'vitest'
import { lessonFacts, LESSONS } from './facts'
import {
  completeRound,
  createKid,
  DAILY_CAP_MS,
  finishPlacement,
  introduceLesson,
  nextRound,
  playDayNumber,
  recordAnswer,
  targetsFor,
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
    expect(targets).toEqual({ baselineMs: 1200, targetMs: 5200, legendTargetMs: 4200 })
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
    expect(targetsFor(k, D1, 42).targetMs).toBe(1800 + 3000)
  })

  it('remembers the best Speed Round', () => {
    const k = kid()
    expect(completeRound(k, { kind: 'speed', core: true, playMs: 1, roundMs: 30_000, date: D1 }).newBest).toBe(false)
    expect(completeRound(k, { kind: 'speed', core: true, playMs: 1, roundMs: 25_000, date: D1 }).newBest).toBe(true)
    expect(k.bestSpeedRoundMs).toBe(25_000)
  })
})
