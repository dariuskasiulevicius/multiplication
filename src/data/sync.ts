// Client for the Family Sheet's Apps Script web app (see apps-script/Code.gs
// and docs/adr/0001). Bodies go as text/plain so the browser sends a simple
// CORS request without a preflight, which Apps Script cannot answer.

import type { Batch, KidState, SyncConfig, Tier } from '../core/types'

export interface SheetResponse {
  ok: boolean
  error?: string
  snapshot?: string | null
}

const MAX_BATCHES = 20

async function parse(res: Response): Promise<SheetResponse> {
  if (!res.ok) return { ok: false, error: `http_${res.status}` }
  try {
    return (await res.json()) as SheetResponse
  } catch {
    return { ok: false, error: 'bad_response' }
  }
}

async function post(url: string, body: object): Promise<SheetResponse> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    })
    return await parse(res)
  } catch {
    return { ok: false, error: 'network' }
  }
}

async function get(url: string, params: Record<string, string>): Promise<SheetResponse> {
  try {
    const res = await fetch(`${url}?${new URLSearchParams(params)}`, { redirect: 'follow' })
    return await parse(res)
  } catch {
    return { ok: false, error: 'network' }
  }
}

/** Store the secret on first use (trust on first use); later calls must match it. */
export function initSheet(cfg: SyncConfig): Promise<SheetResponse> {
  return get(cfg.url, { action: 'init', secret: cfg.secret })
}

/** Fetch a Kid's snapshot; with `claim` this device becomes the Active Device. */
export function fetchSnapshot(cfg: SyncConfig, kidId: string, deviceId: string, kidName: string, claim: boolean) {
  return get(cfg.url, {
    action: 'restore',
    secret: cfg.secret,
    kidId,
    kidName,
    deviceId,
    claim: claim ? '1' : '0',
  })
}

const TIER_CODE: Record<Tier, string> = { unseen: '', bronze: 'B', silver: 'S', gold: 'G', diamond: 'D' }

/** 10 × 10 Sticker Board as Tier codes, `*` marks Dusty. */
export function boardOf(kid: KidState): string[][] {
  const rows: string[][] = []
  for (let a = 1; a <= 10; a++) {
    const row: string[] = []
    for (let b = 1; b <= 10; b++) {
      const f = kid.facts[`${a}x${b}`]
      row.push(TIER_CODE[f.tier] + (f.dusty ? '*' : ''))
    }
    rows.push(row)
  }
  return rows
}

/** Progress worth restoring; device-local fields stay out. */
export function snapshotOf(kid: KidState): string {
  const { outbox: _o, pending: _p, sync: _s, inactive: _i, lastSyncAt: _l, deviceId: _d, ...rest } = kid
  return JSON.stringify(rest)
}

/** Rebuild a KidState from a snapshot or backup file; null if it isn't one. */
export function fromSnapshot(json: string, local: Pick<KidState, 'deviceId' | 'sync'>): KidState | null {
  try {
    const s = JSON.parse(json)
    if (s?.version !== 1 || typeof s.kidId !== 'string' || !s.facts || Object.keys(s.facts).length !== 100) return null
    if (!s.journey || !Array.isArray(s.journey.playDays)) return null
    return {
      ...s,
      deviceId: local.deviceId,
      sync: local.sync,
      outbox: [],
      pending: [],
      lastSyncAt: null,
      inactive: false,
    } as KidState
  } catch {
    return null
  }
}

/** Send waiting Batches plus a fresh snapshot. Returns the ids the sheet accepted. */
export async function pushBatches(kid: KidState): Promise<{ sent: string[]; error?: string }> {
  if (!kid.sync) return { sent: [] }
  const batches: Batch[] = kid.pending.slice(0, MAX_BATCHES)
  const res = await post(kid.sync.url, {
    action: 'sync',
    secret: kid.sync.secret,
    kidId: kid.kidId,
    kidName: kid.name,
    deviceId: kid.deviceId,
    batches,
    snapshot: snapshotOf(kid),
    board: boardOf(kid),
  })
  if (!res.ok) return { sent: [], error: res.error ?? 'unknown' }
  return { sent: batches.map((b) => b.id) }
}
