import { addDays, daysBetween } from './dates'
import type { ISODate, JourneyState, Phase } from './types'

/** 7 × 7: the main Challenge. */
export const CHALLENGE_DAYS = 49
/** 10 × 10: the end of Legend. */
export const LEGEND_DAYS = 100
const DAYS_PER_WORLD = 7
const MAX_SHIELDS = 2
const START_SHIELDS = 1

export function newJourney(): JourneyState {
  return { playDays: [], streak: 0, shields: START_SHIELDS, shieldedDays: [] }
}

/** Phase of a given Play Day number (1-based). */
export function phaseOf(playDay: number): Phase {
  if (playDay <= CHALLENGE_DAYS) return 'challenge'
  if (playDay <= LEGEND_DAYS) return 'legend'
  return 'free'
}

/**
 * World (1..10) a Play Day belongs to: rows of 7 in the 7 × 7 square, then
 * Legend Worlds 8..10 as rings growing the square to 8 × 8, 9 × 9, 10 × 10.
 */
export function worldOf(playDay: number): number | null {
  if (playDay <= CHALLENGE_DAYS) return Math.ceil(playDay / DAYS_PER_WORLD)
  for (const size of [8, 9, 10]) if (playDay <= size * size) return size
  return null
}

/** First and last Play Day of a World. */
export function worldRange(world: number): [number, number] {
  if (world <= 7) return [(world - 1) * DAYS_PER_WORLD + 1, world * DAYS_PER_WORLD]
  return [(world - 1) * (world - 1) + 1, world * world]
}

export function isWorldEnd(playDay: number): boolean {
  const w = worldOf(playDay)
  return w !== null && worldRange(w)[1] === playDay
}

/** Journey Grid cell (1-based row/col) for a Play Day. */
export function gridCell(playDay: number): { row: number; col: number } {
  if (playDay <= CHALLENGE_DAYS) {
    return { row: Math.ceil(playDay / DAYS_PER_WORLD), col: ((playDay - 1) % DAYS_PER_WORLD) + 1 }
  }
  const size = worldOf(playDay) ?? 10
  const i = playDay - (size - 1) * (size - 1) // 1..2*size-1 within the ring
  // Down the new column first, then along the new row back to column 1.
  if (i <= size) return { row: i, col: size }
  return { row: size, col: size - (i - size) }
}

export interface EarnEvents {
  playDay: number
  shieldsUsed: ISODate[]
  streakReset: boolean
  worldCompleted: number | null
  shieldEarned: boolean
}

/** Record a Play Day; Shields cover the gap only if they can cover all of it. */
export function earnPlayDay(j: JourneyState, date: ISODate): EarnEvents | null {
  if (j.playDays.includes(date)) return null
  const last = j.playDays.at(-1)
  const gap = last ? daysBetween(last, date) - 1 : 0
  const events: EarnEvents = {
    playDay: j.playDays.length + 1,
    shieldsUsed: [],
    streakReset: false,
    worldCompleted: null,
    shieldEarned: false,
  }

  if (gap <= 0) {
    j.streak += 1
  } else if (gap <= j.shields) {
    for (let i = 1; i <= gap; i++) events.shieldsUsed.push(addDays(last!, i))
    j.shields -= gap
    j.shieldedDays.push(...events.shieldsUsed)
    j.streak += gap + 1
  } else {
    j.streak = 1
    events.streakReset = true
  }

  j.playDays.push(date)
  if (isWorldEnd(events.playDay)) {
    events.worldCompleted = worldOf(events.playDay)
    if (j.shields < MAX_SHIELDS) {
      j.shields++
      events.shieldEarned = true
    }
  }
  return events
}

export interface StreakView {
  streak: number
  /** Missed days that Shields will cover once today is played. */
  shieldsNeeded: number
  broken: boolean
  playedToday: boolean
}

/** What to show before today is played: Shields are only spent when a Play Day is earned. */
export function viewStreak(j: JourneyState, date: ISODate): StreakView {
  const last = j.playDays.at(-1)
  if (!last) return { streak: 0, shieldsNeeded: 0, broken: false, playedToday: false }
  const gap = daysBetween(last, date) - 1
  if (gap < 0) return { streak: j.streak, shieldsNeeded: 0, broken: false, playedToday: true }
  if (gap === 0) return { streak: j.streak, shieldsNeeded: 0, broken: false, playedToday: false }
  if (gap <= j.shields) return { streak: j.streak, shieldsNeeded: gap, broken: false, playedToday: false }
  return { streak: 0, shieldsNeeded: 0, broken: true, playedToday: false }
}
