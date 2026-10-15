// Domain types. Terms follow CONTEXT.md.

/** Local calendar date, `YYYY-MM-DD`. */
export type ISODate = string

/** `${a}x${b}` — 3x7 and 7x3 are different Facts. */
export type FactId = string

export type Tier = 'unseen' | 'bronze' | 'silver' | 'gold' | 'diamond'
export type Phase = 'challenge' | 'legend' | 'free'
export type Lang = 'en' | 'lt'
export type ThemeId = 'space' | 'pirates' | 'unicorn' | 'pets'

export type RoundKind = 'placement' | 'review' | 'new' | 'mixed' | 'speed' | 'weak' | 'bonus' | 'trial'

/** Where a Cosmetic sits on the avatar. */
export type CosmeticSlot = 'hat' | 'buddy' | 'sparkle'

export interface FactState {
  a: number
  b: number
  introduced: boolean
  /** Leitner box 0..5; higher = longer interval. */
  box: number
  due: ISODate | null
  /** Date the box was last raised, so one day promotes at most once. */
  lastPromoted: ISODate | null
  correct: number
  wrong: number
  /** Stored so it never goes down. */
  tier: Tier
  /** Distinct days with a Fast Answer (first 3 kept). */
  fastDays: ISODate[]
  /** Distinct days answered within Legend Target Time (first 3 kept). */
  legendFastDays: ISODate[]
  dusty: boolean
  lastWrong: ISODate | null
  /** Last few correct answer times as a ratio of Target Time. */
  recent: number[]
  /** Play Day number the Fact was Introduced on; picks a World's Facts for its Speed Trial. */
  introducedDay?: number
}

/** Recent Warm-up taps in ms, per answer digit count. */
export interface Calibration {
  one: number[]
  two: number[]
}

export interface KidSettings {
  recallBudgetMs: number
  legendRecallBudgetMs: number
  sound: boolean
  lang: Lang
  theme: ThemeId
}

export interface JourneyState {
  playDays: ISODate[]
  streak: number
  shields: number
  shieldedDays: ISODate[]
}

export interface DayProgress {
  date: ISODate
  /** Core Rounds for this day, fixed when the day starts. */
  plan: RoundKind[]
  coreDone: number
  bonusDone: number
  /** Active play time today, summed over Sessions. */
  playMs: number
  earned: boolean
  questions: number
  correct: number
  fast: number
  newFacts: number
  /** Correct answer times today, for the median. */
  ms: number[]
}

export interface DaySummary {
  date: ISODate
  playDay: number | null
  minutes: number
  questions: number
  correct: number
  fast: number
  medianMs: number | null
  newFacts: number
  gold: number
  diamond: number
  streak: number
  shields: number
}

/** Best Speed Trial attempt of a World. */
export interface TrialResult {
  stars: number
  fast: number
  total: number
  tries: number
}

/** What a Mystery Chest held; it is already added to the Kid when the chest appears. */
export type ChestReward = { kind: 'stars'; n: number } | { kind: 'cosmetic'; id: string }

export interface SyncConfig {
  url: string
  secret: string
}

export interface AnswerRow {
  id: string
  ts: string
  date: ISODate
  a: number
  b: number
  given: number | null
  correct: boolean
  ms: number
  targetMs: number
  baselineMs: number
  fast: boolean
  round: RoundKind
}

export interface Batch {
  id: string
  answers: AnswerRow[]
  day: DaySummary
}

export interface KidState {
  version: 1
  kidId: string
  name: string
  deviceId: string
  createdAt: string
  settings: KidSettings
  facts: Record<FactId, FactState>
  calibration: Calibration
  journey: JourneyState
  day: DayProgress | null
  placementDone: boolean
  history: DaySummary[]
  bestSpeedRoundMs: number | null
  sync: SyncConfig | null
  /** Answers recorded since the last Batch was cut. */
  outbox: AnswerRow[]
  /** Batches waiting for a successful Sync. */
  pending: Batch[]
  lastSyncAt: string | null
  /** Set when the Family Sheet says another device is now the Active Device. */
  inactive: boolean
  /** The Kid has seen the "How to play" sheet (opened automatically once). */
  helpSeen?: boolean
  /** Stars to spend on Cosmetics. */
  stars: number
  /** Cosmetic ids the Kid has. */
  owned: string[]
  /** Cosmetic worn in each slot. */
  look: Partial<Record<CosmeticSlot, string>>
  /** Best Speed Trial per World number. */
  trials: Record<number, TrialResult>
}
