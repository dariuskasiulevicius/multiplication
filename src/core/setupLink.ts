import type { Lang } from './types'

/** What a Setup Link carries in its URL hash. Never committed anywhere. */
export interface SetupPayload {
  v: 1
  /** Kid id and name. */
  k: string
  n: string
  /** Apps Script web app URL and shared secret; empty when the Kid plays without a Family Sheet. */
  u: string
  s: string
  l?: Lang
}

const PREFIX = '#setup='

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): string {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function setupLink(baseUrl: string, payload: SetupPayload): string {
  return baseUrl.replace(/#.*$/, '') + PREFIX + toBase64Url(JSON.stringify(payload))
}

/** Accepts a full link or just its hash; returns null if it isn't a Setup Link. */
export function parseSetup(text: string): SetupPayload | null {
  const at = text.indexOf(PREFIX)
  if (at < 0) return null
  try {
    const p = JSON.parse(fromBase64Url(text.slice(at + PREFIX.length).trim()))
    if (p?.v !== 1 || typeof p.k !== 'string' || typeof p.n !== 'string') return null
    return { v: 1, k: p.k, n: p.n, u: String(p.u ?? ''), s: String(p.s ?? ''), l: p.l === 'lt' || p.l === 'en' ? p.l : undefined }
  } catch {
    return null
  }
}
