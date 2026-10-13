import { FAMILY_ORDER } from './facts'
import { shuffle, type Rng } from './rng'

const PER_FAMILY = 3
/** Stop after this many Fact Families in a row with at most one correct answer. */
const STOP_AFTER_WEAK = 2

export interface PlacementAnswer {
  a: number
  b: number
  correct: boolean
}

/** Placement Quiz: 3 questions per Fact Family, easiest family first, stopping early for beginners. */
export class Placement {
  readonly families: number[] = [...FAMILY_ORDER]
  family = 0
  private questions: [number, number][] = []
  private q = 0
  private familyCorrect = 0
  private weakRun = 0
  answers: PlacementAnswer[] = []
  /** Families answered fully correctly; all their Facts count as Introduced. */
  knownFamilies: number[] = []
  done = false

  constructor(private rng: Rng) {
    this.startFamily()
  }

  private startFamily(): void {
    const k = this.families[this.family]
    const partners = shuffle([2, 3, 4, 5, 6, 7, 8, 9].filter((m) => m !== k), this.rng).slice(0, PER_FAMILY)
    this.questions = partners.map((m) => (this.rng() < 0.5 ? [k, m] : [m, k]))
    this.q = 0
    this.familyCorrect = 0
  }

  get current(): [number, number] | null {
    return this.done ? null : this.questions[this.q]
  }

  get progress(): number {
    if (this.done) return 1
    return (this.family * PER_FAMILY + this.q) / (this.families.length * PER_FAMILY)
  }

  submit(correct: boolean): void {
    const cur = this.current
    if (!cur) return
    this.answers.push({ a: cur[0], b: cur[1], correct })
    if (correct) this.familyCorrect++
    this.q++
    if (this.q < PER_FAMILY) return

    if (this.familyCorrect === PER_FAMILY) this.knownFamilies.push(this.families[this.family])
    this.weakRun = this.familyCorrect <= 1 ? this.weakRun + 1 : 0
    this.family++
    if (this.weakRun >= STOP_AFTER_WEAK || this.family >= this.families.length) {
      this.done = true
      return
    }
    this.startFamily()
  }
}
