import type { FactId, FactState } from './types'

export const MIN = 1
export const MAX = 10

/** Families in the order they are taught: easiest first. */
export const FAMILY_ORDER = [1, 10, 2, 5, 9, 3, 4, 6, 8, 7] as const

export function factId(a: number, b: number): FactId {
  return `${a}x${b}`
}

export function parseFactId(id: FactId): [number, number] {
  const [a, b] = id.split('x').map(Number)
  return [a, b]
}

export function allFactIds(): FactId[] {
  const ids: FactId[] = []
  for (let a = MIN; a <= MAX; a++) for (let b = MIN; b <= MAX; b++) ids.push(factId(a, b))
  return ids
}

export function digits(n: number): 1 | 2 | 3 {
  return n >= 100 ? 3 : n >= 10 ? 2 : 1
}

export function newFact(a: number, b: number): FactState {
  return {
    a,
    b,
    introduced: false,
    box: 0,
    due: null,
    lastPromoted: null,
    correct: 0,
    wrong: 0,
    tier: 'unseen',
    fastDays: [],
    legendFastDays: [],
    dusty: false,
    lastWrong: null,
    recent: [],
  }
}

export function initialFacts(): Record<FactId, FactState> {
  const facts: Record<FactId, FactState> = {}
  for (const id of allFactIds()) {
    const [a, b] = parseFactId(id)
    facts[id] = newFact(a, b)
  }
  return facts
}

/** The one or two Facts of a Fact Pair. */
export function pairFacts(a: number, b: number): FactId[] {
  return a === b ? [factId(a, b)] : [factId(a, b), factId(b, a)]
}

export function inFamily(id: FactId, family: number): boolean {
  const [a, b] = parseFactId(id)
  return a === family || b === family
}

export interface LessonPair {
  a: number
  b: number
  /** Family whose trick explains this pair. */
  family: number
}

export interface Lesson {
  /** Rule lessons (×1, ×10) teach a whole family with one rule. */
  rule: number | null
  pairs: LessonPair[]
}

const PAIRS_PER_LESSON = 2

function buildLessons(): Lesson[] {
  const seen = new Set<string>()
  const key = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`
  const familyPairs = (family: number): LessonPair[] => {
    const pairs: LessonPair[] = []
    for (const partner of FAMILY_ORDER) {
      const k = key(family, partner)
      if (seen.has(k)) continue
      seen.add(k)
      pairs.push({ a: family, b: partner, family })
    }
    return pairs
  }

  const lessons: Lesson[] = [
    { rule: 1, pairs: familyPairs(1) },
    { rule: 10, pairs: familyPairs(10) },
  ]
  const rest = FAMILY_ORDER.slice(2).flatMap((f) => familyPairs(f))
  for (let i = 0; i < rest.length; i += PAIRS_PER_LESSON) {
    lessons.push({ rule: null, pairs: rest.slice(i, i + PAIRS_PER_LESSON) })
  }
  return lessons
}

/** Every Fact Pair exactly once, grouped into daily lessons. */
export const LESSONS: readonly Lesson[] = buildLessons()

export function lessonFacts(lesson: Lesson): FactId[] {
  return lesson.pairs.flatMap((p) => pairFacts(p.a, p.b))
}

/** First lesson that still has a Fact the Kid hasn't been introduced to. */
export function nextLesson(facts: Record<FactId, FactState>): Lesson | null {
  return LESSONS.find((l) => lessonFacts(l).some((id) => !facts[id].introduced)) ?? null
}
