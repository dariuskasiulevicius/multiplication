import { addDays } from './dates'
import type { FactId, FactState, ISODate, Tier } from './types'

/** Leitner intervals in days, indexed by box. */
export const INTERVALS = [0, 1, 2, 4, 7, 14] as const
const MAX_BOX = INTERVALS.length - 1
const DAYS_FOR_GOLD = 3
const RECENT = 5

export const TIER_ORDER: readonly Tier[] = ['unseen', 'bronze', 'silver', 'gold', 'diamond']

export function tierRank(t: Tier): number {
  return TIER_ORDER.indexOf(t)
}

export function earnedTier(f: FactState): Tier {
  if (f.fastDays.length >= DAYS_FOR_GOLD && f.legendFastDays.length >= DAYS_FOR_GOLD) return 'diamond'
  if (f.fastDays.length >= DAYS_FOR_GOLD) return 'gold'
  if (f.fastDays.length >= 1) return 'silver'
  if (f.correct >= 1) return 'bronze'
  return 'unseen'
}

export interface AnswerInput {
  correct: boolean
  ms: number
  targetMs: number
  legendTargetMs: number
  date: ISODate
}

export interface AnswerOutcome {
  correct: boolean
  fast: boolean
  legendFast: boolean
  tierBefore: Tier
  tierAfter: Tier
}

function addDay(days: ISODate[], date: ISODate): void {
  if (days.length < DAYS_FOR_GOLD && !days.includes(date)) days.push(date)
}

/** Apply one answer to a Fact: speed credit, Tier, Dusty mark and Leitner box. */
export function applyAnswer(f: FactState, input: AnswerInput): AnswerOutcome {
  const tierBefore = f.tier
  const fast = input.correct && input.ms <= input.targetMs
  const legendFast = input.correct && input.ms <= input.legendTargetMs

  if (input.correct) {
    f.correct++
    f.introduced = true
    f.recent.push(Math.round((input.ms / input.targetMs) * 100) / 100)
    if (f.recent.length > RECENT) f.recent.splice(0, f.recent.length - RECENT)
    if (fast) {
      addDay(f.fastDays, input.date)
      f.dusty = false
    }
    if (legendFast) addDay(f.legendFastDays, input.date)
  } else {
    f.wrong++
    f.lastWrong = input.date
    if (f.tier !== 'unseen') f.dusty = true
  }

  // Tiers never go down; a miss only makes the Fact Dusty.
  const computed = earnedTier(f)
  if (tierRank(computed) > tierRank(f.tier)) f.tier = computed

  if (f.introduced) schedule(f, fast, input.correct, input.date)

  return { correct: input.correct, fast, legendFast, tierBefore, tierAfter: f.tier }
}

function schedule(f: FactState, fast: boolean, correct: boolean, date: ISODate): void {
  if (fast) {
    if (f.lastPromoted !== date) {
      f.box = Math.min(MAX_BOX, f.box + 1)
      f.lastPromoted = date
    }
    f.due = addDays(date, INTERVALS[f.box])
  } else if (correct) {
    f.box = Math.max(1, f.box)
    f.due = addDays(date, 1)
  } else {
    f.box = 1
    f.due = addDays(date, 1)
  }
}

/** Introduce a Fact without an answer (e.g. a whole family known from placement). */
export function introduce(f: FactState, date: ISODate, box = 0): void {
  if (f.introduced) return
  f.introduced = true
  f.box = box
  f.due = addDays(date, INTERVALS[box])
}

export function isDue(f: FactState, date: ISODate): boolean {
  return f.introduced && f.due !== null && f.due <= date
}

function slowness(f: FactState): number {
  if (f.recent.length === 0) return 2
  return f.recent.reduce((s, r) => s + r, 0) / f.recent.length
}

/**
 * Introduced Facts ordered weakest first: any miss in the recent days, then
 * lower Tier, then slower answers relative to Target Time.
 */
export function rankWeak(facts: Record<FactId, FactState>, recentDays: readonly ISODate[]): FactId[] {
  const recent = new Set(recentDays)
  const missed = (f: FactState) => (f.lastWrong !== null && recent.has(f.lastWrong) ? 0 : 1)
  return Object.entries(facts)
    .filter(([, f]) => f.introduced)
    .sort(([, x], [, y]) => missed(x) - missed(y) || tierRank(x.tier) - tierRank(y.tier) || slowness(y) - slowness(x))
    .map(([id]) => id)
}

export interface NextStep {
  /** The medal (Tier) to aim for next, `new` if not taught yet, `max` at Diamond. */
  next: 'new' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'max'
  /** Days still needed for Gold or Diamond. */
  days: number
}

/** What a Kid has to do for the Fact's next medal. */
export function nextStep(f: FactState): NextStep {
  switch (f.tier) {
    case 'unseen':
      return { next: f.introduced ? 'bronze' : 'new', days: 0 }
    case 'bronze':
      return { next: 'silver', days: 0 }
    case 'silver':
      return { next: 'gold', days: DAYS_FOR_GOLD - f.fastDays.length }
    case 'gold':
      return { next: 'diamond', days: DAYS_FOR_GOLD - f.legendFastDays.length }
    case 'diamond':
      return { next: 'max', days: 0 }
  }
}

export function countTiers(facts: Record<FactId, FactState>): Record<Tier, number> {
  const counts: Record<Tier, number> = { unseen: 0, bronze: 0, silver: 0, gold: 0, diamond: 0 }
  for (const f of Object.values(facts)) counts[f.tier]++
  return counts
}
