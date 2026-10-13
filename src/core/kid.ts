// Kid-level actions. They mutate the KidState in place (it is a Svelte $state
// proxy in the app, a plain object in tests) and return what happened.

import { addTap, baseline, emptyCalibration, median } from './calibration'
import { digits, factId, inFamily, initialFacts, lessonFacts, type Lesson } from './facts'
import { earnPlayDay, newJourney, phaseOf, type EarnEvents } from './journey'
import { applyAnswer, countTiers, introduce, type AnswerOutcome } from './mastery'
import { uid } from './rng'
import type {
  AnswerRow,
  Batch,
  DayProgress,
  DaySummary,
  ISODate,
  KidState,
  Lang,
  Phase,
  RoundKind,
  SyncConfig,
  ThemeId,
} from './types'

export const DAILY_CAP_MS = 9 * 60_000
export const DEFAULT_RECALL_BUDGET_MS = 4000
export const DEFAULT_LEGEND_RECALL_BUDGET_MS = 3000
const HISTORY_DAYS = 120
const DAY_SAMPLES = 300

export interface NewKid {
  kidId: string
  name: string
  deviceId: string
  lang: Lang
  theme: ThemeId
  sync: SyncConfig | null
  now: Date
}

export function createKid(o: NewKid): KidState {
  return {
    version: 1,
    kidId: o.kidId,
    name: o.name,
    deviceId: o.deviceId,
    createdAt: o.now.toISOString(),
    settings: {
      recallBudgetMs: DEFAULT_RECALL_BUDGET_MS,
      legendRecallBudgetMs: DEFAULT_LEGEND_RECALL_BUDGET_MS,
      sound: true,
      lang: o.lang,
      theme: o.theme,
    },
    facts: initialFacts(),
    calibration: emptyCalibration(),
    journey: newJourney(),
    day: null,
    placementDone: false,
    history: [],
    bestSpeedRoundMs: null,
    sync: o.sync,
    outbox: [],
    pending: [],
    lastSyncAt: null,
    inactive: false,
  }
}

/** Number of the Play Day being played on `date` (or just earned on it). */
export function playDayNumber(kid: KidState, date: ISODate): number {
  const days = kid.journey.playDays
  return days.at(-1) === date ? days.length : days.length + 1
}

export function phaseFor(kid: KidState, date: ISODate): Phase {
  return phaseOf(playDayNumber(kid, date))
}

function corePlan(kid: KidState, date: ISODate): RoundKind[] {
  if (!kid.placementDone) return ['placement', 'new', 'mixed']
  switch (phaseFor(kid, date)) {
    case 'challenge':
      return Object.values(kid.facts).some((f) => f.introduced)
        ? ['review', 'new', 'mixed', 'speed', 'weak']
        : ['new', 'review', 'mixed', 'speed', 'weak']
    case 'legend':
      return ['weak', 'speed', 'mixed']
    case 'free':
      return ['mixed', 'speed']
  }
}

/** Today's progress; rolling over to a new date closes the previous day. */
export function ensureDay(kid: KidState, date: ISODate): DayProgress {
  if (kid.day?.date === date) return kid.day
  if (kid.day && kid.outbox.length > 0) cutBatch(kid, kid.day.date)
  kid.day = {
    date,
    plan: corePlan(kid, date),
    coreDone: 0,
    bonusDone: 0,
    playMs: 0,
    earned: false,
    questions: 0,
    correct: 0,
    fast: 0,
    newFacts: 0,
    ms: [],
  }
  return kid.day
}

export interface Targets {
  baselineMs: number
  targetMs: number
  legendTargetMs: number
}

export function targetsFor(kid: KidState, date: ISODate, answer: number): Targets {
  const baselineMs = baseline(kid.calibration, digits(answer))
  const legendTargetMs = baselineMs + kid.settings.legendRecallBudgetMs
  const targetMs =
    phaseFor(kid, date) === 'challenge' ? baselineMs + kid.settings.recallBudgetMs : legendTargetMs
  return { baselineMs, targetMs, legendTargetMs }
}

/** The last 3 Play Days plus today: the window for "recent miss". */
export function recentDays(kid: KidState, date: ISODate): ISODate[] {
  return [...kid.journey.playDays.slice(-3), date]
}

export function recordTap(kid: KidState, digitCount: number, ms: number): void {
  addTap(kid.calibration, digitCount, ms)
}

export interface AnswerInput {
  a: number
  b: number
  given: number | null
  ms: number
  round: RoundKind
  date: ISODate
  now: Date
}

export function recordAnswer(kid: KidState, input: AnswerInput): { outcome: AnswerOutcome; targets: Targets } {
  const day = ensureDay(kid, input.date)
  const answer = input.a * input.b
  const targets = targetsFor(kid, input.date, answer)
  const correct = input.given === answer
  const outcome = applyAnswer(kid.facts[factId(input.a, input.b)], {
    correct,
    ms: input.ms,
    targetMs: targets.targetMs,
    legendTargetMs: targets.legendTargetMs,
    date: input.date,
  })

  day.questions++
  if (correct) {
    day.correct++
    day.ms.push(Math.round(input.ms))
    if (day.ms.length > DAY_SAMPLES) day.ms.shift()
  }
  if (outcome.fast) day.fast++

  const row: AnswerRow = {
    id: uid(),
    ts: input.now.toISOString(),
    date: input.date,
    a: input.a,
    b: input.b,
    given: input.given,
    correct,
    ms: Math.round(input.ms),
    targetMs: targets.targetMs,
    baselineMs: targets.baselineMs,
    fast: outcome.fast,
    round: input.round,
  }
  kid.outbox.push(row)
  return { outcome, targets }
}

/** Introduce a lesson's Facts when its New Facts round starts. */
export function introduceLesson(kid: KidState, lesson: Lesson, date: ISODate): number {
  const day = ensureDay(kid, date)
  let count = 0
  for (const id of lessonFacts(lesson)) {
    if (kid.facts[id].introduced) continue
    introduce(kid.facts[id], date)
    count++
  }
  day.newFacts += count
  return count
}

/** Fully known Fact Families from the Placement Quiz count as Introduced. */
export function finishPlacement(kid: KidState, knownFamilies: number[], date: ISODate): number {
  ensureDay(kid, date) // today's plan stays the placement plan
  for (const family of knownFamilies) {
    for (const [id, f] of Object.entries(kid.facts)) {
      if (inFamily(id, family)) introduce(f, date, 1)
    }
  }
  kid.placementDone = true
  return Object.values(kid.facts).filter((f) => f.introduced).length
}

export interface NextRound {
  kind: RoundKind
  core: boolean
  /** 1-based index among today's Core Rounds. */
  index: number
  total: number
}

/** What the next Round on `date` would be. Read-only, so it is safe in derived UI state. */
export function nextRound(kid: KidState, date: ISODate): NextRound | null {
  const day = kid.day?.date === date ? kid.day : null
  const plan = day?.plan ?? corePlan(kid, date)
  const coreDone = day?.coreDone ?? 0
  if (!day?.earned) return { kind: plan[coreDone], core: true, index: coreDone + 1, total: plan.length }
  if (day.playMs < DAILY_CAP_MS) return { kind: 'bonus', core: false, index: day.bonusDone + 1, total: 0 }
  return null
}

export interface RoundDone {
  kind: RoundKind
  core: boolean
  playMs: number
  /** Whole-round time, used for the Speed Round personal best. */
  roundMs: number
  date: ISODate
}

export interface RoundResult {
  earned: EarnEvents | null
  newBest: boolean
  capReached: boolean
}

export function completeRound(kid: KidState, r: RoundDone): RoundResult {
  const day = ensureDay(kid, r.date)
  day.playMs += r.playMs
  if (r.core) day.coreDone++
  else day.bonusDone++

  let newBest = false
  if (r.kind === 'speed' && (kid.bestSpeedRoundMs === null || r.roundMs < kid.bestSpeedRoundMs)) {
    newBest = kid.bestSpeedRoundMs !== null
    kid.bestSpeedRoundMs = r.roundMs
  }

  // Core Rounds earn the Play Day; so does reaching the Daily Cap, so a slow
  // Kid is never kept past 9 minutes for it.
  let earned: EarnEvents | null = null
  if (!day.earned && (day.coreDone >= day.plan.length || day.playMs >= DAILY_CAP_MS)) {
    earned = earnPlayDay(kid.journey, r.date)
    day.earned = true
  }
  cutBatch(kid, r.date)
  return { earned, newBest, capReached: day.playMs >= DAILY_CAP_MS }
}

export function summarize(kid: KidState, date: ISODate): DaySummary {
  const day = kid.day?.date === date ? kid.day : null
  const tiers = countTiers(kid.facts)
  const index = kid.journey.playDays.indexOf(date)
  return {
    date,
    playDay: index >= 0 ? index + 1 : null,
    minutes: Math.round(((day?.playMs ?? 0) / 60_000) * 10) / 10,
    questions: day?.questions ?? 0,
    correct: day?.correct ?? 0,
    fast: day?.fast ?? 0,
    medianMs: median(day?.ms ?? []),
    newFacts: day?.newFacts ?? 0,
    gold: tiers.gold + tiers.diamond,
    diamond: tiers.diamond,
    streak: kid.journey.streak,
    shields: kid.journey.shields,
  }
}

/** Close the answers since the last Batch into a new one waiting for Sync. */
export function cutBatch(kid: KidState, date: ISODate): Batch | null {
  const summary = summarize(kid, date)
  const i = kid.history.findIndex((h) => h.date === date)
  if (i >= 0) kid.history[i] = summary
  else kid.history.push(summary)
  if (kid.history.length > HISTORY_DAYS) kid.history.splice(0, kid.history.length - HISTORY_DAYS)

  if (!kid.sync) {
    kid.outbox = []
    return null
  }
  const batch: Batch = { id: uid(), answers: kid.outbox, day: summary }
  kid.pending.push(batch)
  kid.outbox = []
  return batch
}
