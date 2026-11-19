import { describe, expect, it } from 'vitest'
import { b64url, fromB64url, newVapidKeys, sameKey } from './push'

describe('Play Reminder keys', () => {
  it('base64url round-trips without padding', () => {
    const bytes = new Uint8Array([0, 251, 255, 62, 63, 1])
    expect(b64url(bytes)).toBe('APv_Pj8B')
    expect([...fromB64url('APv_Pj8B')]).toEqual([...bytes])
  })

  it('makes a P-256 VAPID key pair in the sizes the Family Sheet expects', async () => {
    const { publicKey, privateKey } = await newVapidKeys()
    expect(publicKey).toHaveLength(87) // 65 bytes: 0x04, x, y
    expect(privateKey).toHaveLength(43) // 32 bytes
    expect(fromB64url(publicKey)[0]).toBe(4)
  })

  it('tells whether a subscription was made with the same key', () => {
    const key = fromB64url('BAEC')
    expect(sameKey(key.buffer.slice(0) as ArrayBuffer, key)).toBe(true)
    expect(sameKey(new Uint8Array([4, 1, 3]).buffer, key)).toBe(false)
    expect(sameKey(null, key)).toBe(false)
  })
})
