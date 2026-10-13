import { describe, expect, it } from 'vitest'
import { THEME_IDS, THEMES } from '.'

describe('themes', () => {
  it.each(THEME_IDS)('%s has 10 Worlds and 10 World Badges named in EN and LT', (id) => {
    const th = THEMES[id]
    expect(th.worlds).toHaveLength(10)
    expect(th.badges).toHaveLength(10)
    for (const item of [...th.worlds, ...th.badges]) {
      expect(item.emoji).not.toBe('')
      expect(item.name.en).not.toBe('')
      expect(item.name.lt).not.toBe('')
    }
  })
})
