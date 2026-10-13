import { describe, expect, it } from 'vitest'
import { parseSetup, setupLink } from './setupLink'

describe('Setup Link', () => {
  it('round-trips a payload with Lithuanian letters', () => {
    const payload = { v: 1 as const, k: 'kid-1', n: 'Gabrielė', u: 'https://script.google.com/macros/s/X/exec', s: 'sec', l: 'lt' as const }
    const link = setupLink('https://x.github.io/multiplication/#old', payload)
    expect(link.startsWith('https://x.github.io/multiplication/#setup=')).toBe(true)
    expect(parseSetup(link)).toEqual(payload)
  })

  it('rejects anything else', () => {
    expect(parseSetup('https://x.github.io/multiplication/')).toBeNull()
    expect(parseSetup('#setup=not-base64!')).toBeNull()
  })
})
