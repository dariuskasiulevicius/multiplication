import { describe, expect, it } from 'vitest'
import { allFactIds, initialFacts, LESSONS, lessonFacts, nextLesson, pairFacts } from './facts'

describe('facts', () => {
  it('has 100 ordered Facts', () => {
    expect(allFactIds()).toHaveLength(100)
    expect(new Set(allFactIds()).size).toBe(100)
  })

  it('pairs a×b with b×a, squares stay single', () => {
    expect(pairFacts(3, 7)).toEqual(['3x7', '7x3'])
    expect(pairFacts(4, 4)).toEqual(['4x4'])
  })

  it('lessons teach every Fact exactly once, rules first, at most 2 pairs otherwise', () => {
    const ids = LESSONS.flatMap(lessonFacts)
    expect(ids).toHaveLength(100)
    expect(new Set(ids).size).toBe(100)
    expect(LESSONS[0].rule).toBe(1)
    expect(LESSONS[1].rule).toBe(10)
    for (const l of LESSONS.slice(2)) {
      expect(l.rule).toBeNull()
      expect(l.pairs.length).toBeLessThanOrEqual(2)
    }
    // ×7 is the last family taught: 7×7 comes last.
    expect(LESSONS.at(-1)!.pairs.at(-1)).toMatchObject({ a: 7, b: 7 })
  })

  it('nextLesson skips lessons already introduced', () => {
    const facts = initialFacts()
    expect(nextLesson(facts)).toBe(LESSONS[0])
    for (const id of lessonFacts(LESSONS[0])) facts[id].introduced = true
    expect(nextLesson(facts)).toBe(LESSONS[1])
  })
})
