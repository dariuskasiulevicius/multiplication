import { afterEach, describe, expect, it, vi } from 'vitest'
import { createKid } from '../core/kid'
import { pushBatches } from './sync'

const kid = () => {
  const k = createKid({
    kidId: 'k1',
    name: 'Ema',
    deviceId: 'dev1',
    lang: 'lt',
    theme: 'unicorn',
    sync: { url: 'https://script.example/exec', secret: 's' },
    now: new Date('2026-10-01T16:00:00Z'),
  })
  k.settings.dailyMinutes = 7
  k.settingsChangedAt = '2026-11-10T08:00:00.000Z'
  return k
}

afterEach(() => vi.unstubAllGlobals())

describe('pushBatches', () => {
  it("sends the Parent Settings with their change time and returns the sheet's newer ones", async () => {
    const settings = { changedAt: '2026-11-10T09:00:00.000Z', dailyMinutes: 5 }
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ ok: true, settings })))
    vi.stubGlobal('fetch', fetch)
    const res = await pushBatches(kid())
    const body = JSON.parse(fetch.mock.calls[0][1].body as string)
    expect(body.settings).toEqual({
      dailyMinutes: 7,
      recallBudgetMs: 10_000,
      legendRecallBudgetMs: 6000,
      changedAt: '2026-11-10T08:00:00.000Z',
    })
    expect(res).toEqual({ sent: [], settings })
  })

  it('a sheet script from before the Settings tab returns none', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }))))
    expect((await pushBatches(kid())).settings).toBeUndefined()
  })
})
