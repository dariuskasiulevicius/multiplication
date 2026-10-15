import { factId, lessonFacts, nextLesson, parseFactId, type Lesson } from './facts'
import { isDue, rankWeak } from './mastery'
import { shuffle, type Rng } from './rng'
import type { FactId, FactState, ISODate, RoundKind } from './types'

export const ROUND_SIZE = 10
export const TRIAL_SIZE = 20
/** Recent misses above this skip new Facts for a day of consolidation. */
const CONSOLIDATE_AT = 6

export type RoundItem =
  | { type: 'rule'; family: number }
  | { type: 'intro'; a: number; b: number; family: number }
  | { type: 'typed'; a: number; b: number; retry?: boolean }

export interface BuiltRound {
  kind: RoundKind
  items: RoundItem[]
  /** Lesson to introduce when the round starts (New Facts rounds only). */
  lesson: Lesson | null
}

export interface BuildContext {
  facts: Record<FactId, FactState>
  date: ISODate
  /** Last few Play Days plus today, for "recent miss" checks. */
  recentDays: ISODate[]
  rng: Rng
  /** Facts Introduced in the World of a Speed Trial. */
  worldFacts?: FactId[]
}

const typed = (id: FactId): RoundItem => {
  const [a, b] = parseFactId(id)
  return { type: 'typed', a, b }
}

function introducedIds(ctx: BuildContext): FactId[] {
  return Object.keys(ctx.facts).filter((id) => ctx.facts[id].introduced)
}

/** Fill to `size` from the sources in order, without duplicates, then cycle if still short. */
function fill(size: number, ...sources: FactId[][]): FactId[] {
  const out: FactId[] = []
  for (const src of sources) {
    for (const id of src) {
      if (out.length >= size) return out
      if (!out.includes(id)) out.push(id)
    }
  }
  const base = [...out]
  for (let i = 0; out.length < size && base.length > 0; i++) out.push(base[i % base.length])
  return out
}

/** Reorder so the same Fact never comes twice in a row, keeping the shuffled order where possible. */
function spread(ids: FactId[]): FactId[] {
  const rest = [...ids]
  const out: FactId[] = []
  while (rest.length > 0) {
    const prev = out.at(-1)
    const counts = new Map<FactId, number>()
    for (const id of rest) counts.set(id, (counts.get(id) ?? 0) + 1)
    const [top, topCount] = [...counts].sort((x, y) => y[1] - x[1])[0]
    // The most frequent Fact must go now if it outnumbers all the others.
    let i = topCount > rest.length - topCount && top !== prev ? rest.indexOf(top) : rest.findIndex((id) => id !== prev)
    if (i < 0) i = 0
    out.push(rest.splice(i, 1)[0])
  }
  return out
}

function recentMisses(ctx: BuildContext): number {
  const recent = new Set(ctx.recentDays)
  return Object.values(ctx.facts).filter((f) => f.introduced && f.lastWrong && recent.has(f.lastWrong)).length
}

export function buildRound(kind: RoundKind, ctx: BuildContext): BuiltRound {
  const all = introducedIds(ctx)
  const weak = rankWeak(ctx.facts, ctx.recentDays)
  const random = shuffle(all, ctx.rng)

  switch (kind) {
    case 'new': {
      const lesson = nextLesson(ctx.facts)
      if (!lesson) return buildRound('mixed', ctx)
      if (all.length > 0 && recentMisses(ctx) >= CONSOLIDATE_AT) return buildRound('weak', ctx)
      return newFactsRound(lesson, ctx, weak)
    }
    case 'review': {
      const due = shuffle(
        all.filter((id) => isDue(ctx.facts[id], ctx.date)),
        ctx.rng,
      ).sort((x, y) => (ctx.facts[x].due ?? '').localeCompare(ctx.facts[y].due ?? ''))
      return round(kind, fill(ROUND_SIZE, due, weak, random), ctx)
    }
    case 'speed': {
      const known = [...random].sort((x, y) => ctx.facts[y].box - ctx.facts[x].box)
      return round(kind, fill(ROUND_SIZE, known), ctx)
    }
    case 'weak':
      return round(kind, fill(ROUND_SIZE, weak), ctx)
    case 'mixed':
    case 'bonus': {
      const due = all.filter((id) => isDue(ctx.facts[id], ctx.date))
      const picked = fill(ROUND_SIZE, weak.slice(0, 4), shuffle(due, ctx.rng).slice(0, 3), random, weak)
      return round(kind, picked, ctx)
    }
    case 'trial': {
      // About half from the World's own Facts, the rest the Kid's Weak Facts.
      const own = shuffle(ctx.worldFacts ?? [], ctx.rng).slice(0, TRIAL_SIZE / 2)
      return round(kind, fill(TRIAL_SIZE, own, weak, random), ctx)
    }
    case 'placement':
      throw new Error('Placement Quiz is driven by placement.ts')
  }
}

function round(kind: RoundKind, ids: FactId[], ctx: BuildContext): BuiltRound {
  return { kind, items: spread(shuffle(ids, ctx.rng)).map(typed), lesson: null }
}

function newFactsRound(lesson: Lesson, ctx: BuildContext, weak: FactId[]): BuiltRound {
  const fresh = lessonFacts(lesson).filter((id) => !ctx.facts[id].introduced)
  const items: RoundItem[] = []

  if (lesson.rule !== null) {
    // One rule card teaches the whole family; practice a sample of it.
    items.push({ type: 'rule', family: lesson.rule })
    const practice = fill(ROUND_SIZE, shuffle(fresh, ctx.rng))
    items.push(...spread(practice).map(typed))
    return { kind: 'new', items, lesson }
  }

  for (const p of lesson.pairs) {
    if (fresh.includes(factId(p.a, p.b)) || fresh.includes(factId(p.b, p.a))) {
      items.push({ type: 'intro', a: p.a, b: p.b, family: p.family })
    }
  }
  // Each new Fact twice, the rest from the Kid's Weak Facts (or more of the new ones).
  const practice = [...fresh, ...fresh]
  for (const id of weak) {
    if (practice.length >= ROUND_SIZE) break
    practice.push(id)
  }
  for (let i = 0; practice.length < ROUND_SIZE && fresh.length > 0; i++) practice.push(fresh[i % fresh.length])
  items.push(...spread(shuffle(practice, ctx.rng)).map(typed))
  return { kind: 'new', items, lesson }
}

/** Four answer options for a New Fact's first, multiple-choice question. */
export function choiceOptions(a: number, b: number, rng: Rng): number[] {
  const answer = a * b
  const candidates = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, answer + 1, answer - 1, answer + 10, answer + 2]
  const wrong = shuffle(
    [...new Set(candidates)].filter((n) => n > 0 && n !== answer),
    rng,
  ).slice(0, 3)
  return shuffle([answer, ...wrong], rng)
}

export interface ItemResult {
  correct: boolean
  fast: boolean
}

/** Walks a Round: requeues a missed Fact once, a few questions later, and counts combos. */
export class RoundRunner {
  items: RoundItem[]
  pos = 0
  combo = 0
  bestCombo = 0
  answered = 0
  correct = 0
  fast = 0
  private retried = new Set<FactId>()
  private requeue: boolean

  /** Without `requeue` (Speed Trials) every question is asked once, so the score is out of the round size. */
  constructor(items: RoundItem[], requeue = true) {
    this.items = [...items]
    this.requeue = requeue
  }

  get current(): RoundItem | undefined {
    return this.items[this.pos]
  }

  get done(): boolean {
    return this.pos >= this.items.length
  }

  get questionCount(): number {
    return this.items.filter((i) => i.type === 'typed').length
  }

  /** Move past a card that needs no answer. */
  skip(): void {
    this.pos++
  }

  answer(result: ItemResult): void {
    const item = this.current
    if (!item || item.type !== 'typed') return
    this.answered++
    if (result.correct) this.correct++
    if (result.fast) this.fast++
    this.combo = result.fast ? this.combo + 1 : 0
    this.bestCombo = Math.max(this.bestCombo, this.combo)

    const id = factId(item.a, item.b)
    if (this.requeue && !result.correct && !this.retried.has(id)) {
      this.retried.add(id)
      const at = Math.min(this.items.length, this.pos + 3)
      this.items.splice(at, 0, { type: 'typed', a: item.a, b: item.b, retry: true })
    }
    this.pos++
  }
}
