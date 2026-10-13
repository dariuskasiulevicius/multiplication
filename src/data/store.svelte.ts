import { del, get, set } from 'idb-keyval'
import { migrateKid } from '../core/kid'
import { uid } from '../core/rng'
import type { KidState } from '../core/types'
import type { SetupPayload } from '../core/setupLink'
import { pushBatches } from './sync'

export type Screen = 'loading' | 'welcome' | 'parentSetup' | 'onboarding' | 'home' | 'play' | 'settings' | 'parent'

export interface ParentConfig {
  url: string
  secret: string
  kids: { kidId: string; name: string }[]
}

export const app = $state({
  screen: 'loading' as Screen,
  kid: null as KidState | null,
  /** Setup Link waiting to be applied by onboarding. */
  setup: null as SetupPayload | null,
  updateReady: false,
  syncing: false,
  syncError: null as string | null,
})

const KID = 'kid'
const DEVICE = 'deviceId'
const PARENT = 'parent'

export async function loadKid(): Promise<KidState | null> {
  const kid = await get<KidState>(KID)
  return kid ? migrateKid(kid) : null
}

export async function saveKid(): Promise<void> {
  if (app.kid) await set(KID, $state.snapshot(app.kid))
}

export async function deleteKid(): Promise<void> {
  app.kid = null
  await del(KID)
}

/** Stable per-browser id, kept even when a Kid's progress is deleted. */
export async function deviceId(): Promise<string> {
  let id = await get<string>(DEVICE)
  if (!id) {
    id = uid()
    await set(DEVICE, id)
  }
  return id
}

export async function loadParent(): Promise<ParentConfig | null> {
  return (await get<ParentConfig>(PARENT)) ?? null
}

export async function saveParent(cfg: ParentConfig): Promise<void> {
  await set(PARENT, $state.snapshot(cfg))
}

/** Ask the browser not to evict our storage (iOS Safari clears unused sites after 7 days). */
export async function persistStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Not supported; the Family Sheet snapshot is the fallback.
  }
}

/** Push waiting Batches to the Family Sheet; safe to call often. */
export async function syncNow(): Promise<void> {
  const kid = app.kid
  // Runs even with nothing pending: the reply tells a replaced device it is no longer active.
  if (!kid?.sync || kid.inactive || app.syncing || !navigator.onLine) return
  app.syncing = true
  try {
    // A Sync sends at most 20 Batches; keep going until the backlog is empty.
    for (let i = 0; i < 10; i++) {
      const { sent, error } = await pushBatches($state.snapshot(kid) as KidState)
      if (error) {
        app.syncError = error
        if (error === 'inactive_device') kid.inactive = true
        break
      }
      app.syncError = null
      kid.pending = kid.pending.filter((b) => !sent.includes(b.id))
      kid.lastSyncAt = new Date().toISOString()
      if (kid.pending.length === 0) break
    }
    await saveKid()
  } finally {
    app.syncing = false
  }
}
