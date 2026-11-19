// Play Reminders on this device (docs/adr/0004): a Web Push subscription the
// Family Sheet sends empty pushes to while today's Play Day isn't earned;
// public/push-sw.js turns each one into a notification.

import type { SyncConfig } from '../core/types'
import { isIos, isStandalone } from './device'
import { fetchPushKey } from './sync'

export type ReminderSupport = 'ready' | 'homeScreen' | 'unsupported'

/** iPhone and iPad allow web notifications only from the Home Screen. */
export function reminderSupport(): ReminderSupport {
  if (isIos() && !isStandalone()) return 'homeScreen'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ready'
}

/** This device's subscription: null if none, undefined if it can't be known (no service worker). */
export async function currentPush(): Promise<PushSubscription | null | undefined> {
  if (reminderSupport() !== 'ready') return undefined
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    return reg ? await reg.pushManager.getSubscription() : undefined
  } catch {
    return undefined
  }
}

export type EnableResult = 'on' | 'denied' | { error: string }

/** Ask for permission and subscribe. Call it straight from a tap: iOS asks only then. */
export async function enableReminders(cfg: SyncConfig): Promise<EnableResult> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return { error: 'no_service_worker' }
    let res = await fetchPushKey(cfg)
    if (res.ok && !res.publicKey) {
      const subject = new URL(import.meta.env.BASE_URL, location.href).href
      res = await fetchPushKey(cfg, { ...(await newVapidKeys()), subject })
    }
    if (!res.ok || !res.publicKey) return { error: res.error ?? 'no_key' }
    const key = fromB64url(res.publicKey)
    let sub = await reg.pushManager.getSubscription()
    if (sub && !sameKey(sub.options.applicationServerKey, key)) {
      await sub.unsubscribe()
      sub = null
    }
    if (!sub) await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    return 'on'
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function disableReminders(): Promise<void> {
  await (await currentPush())?.unsubscribe()
}

/** A VAPID key pair: the uncompressed public point and the private scalar, base64url. */
export async function newVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const raw = await crypto.subtle.exportKey('raw', pair.publicKey)
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  return { publicKey: b64url(new Uint8Array(raw)), privateKey: jwk.d! }
}

export function sameKey(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.length) return false
  const x = new Uint8Array(a)
  return x.every((v, i) => v === b[i])
}

export function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function fromB64url(text: string): Uint8Array<ArrayBuffer> {
  const s = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
