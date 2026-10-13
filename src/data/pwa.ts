import { registerSW } from 'virtual:pwa-register'
import { app } from './store.svelte'

let update: ((reload?: boolean) => Promise<void>) | null = null

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
}

/** Android/desktop Chrome hands us this once; kept for the install step. */
export let installPrompt: InstallPromptEvent | null = null

export function initPwa(): void {
  update = registerSW({
    onNeedRefresh() {
      app.updateReady = true
    },
  })
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPrompt = e as InstallPromptEvent
  })
}

/** Called from the Home screen only, so a new version never interrupts a Round. */
export function applyUpdate(): void {
  void update?.(true)
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
