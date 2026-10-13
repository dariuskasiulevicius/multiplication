<script lang="ts">
  import { onMount } from 'svelte'
  import { createKid } from '../../core/kid'
  import { setupLink } from '../../core/setupLink'
  import type { ThemeId } from '../../core/types'
  import { installPrompt, isIos, isStandalone } from '../../data/pwa'
  import { app, deviceId, persistStorage, saveKid } from '../../data/store.svelte'
  import { fetchSnapshot, fromSnapshot } from '../../data/sync'
  import { i18n, t } from '../../i18n/index.svelte'
  import { THEMES } from '../../themes'
  import LangToggle from '../components/LangToggle.svelte'
  import ThemePicker from '../components/ThemePicker.svelte'

  type Step = 'restore' | 'theme' | 'install' | 'ready' | 'restored'

  const setup = app.setup!
  const sync = setup.u ? { url: setup.u, secret: setup.s } : null
  let step = $state<Step>(sync ? 'restore' : 'theme')
  let theme = $state<ThemeId | null>(null)
  let copied = $state(false)
  let device = ''

  onMount(async () => {
    device = await deviceId()
    if (!sync) return
    // The Family Sheet may already hold this Kid's progress (new or reset device).
    const res = await fetchSnapshot(sync, setup.k, device, setup.n, true)
    const restored = res.ok && res.snapshot ? fromSnapshot(res.snapshot, { deviceId: device, sync }) : null
    if (restored) {
      app.kid = restored
      i18n.lang = restored.settings.lang
      await saveKid()
      await persistStorage()
      step = 'restored'
    } else {
      step = 'theme'
    }
  })

  async function pick(id: ThemeId) {
    theme = id
    app.kid = createKid({
      kidId: setup.k,
      name: setup.n,
      deviceId: device || (await deviceId()),
      lang: i18n.lang,
      theme: id,
      sync,
      now: new Date(),
    })
    await saveKid()
    await persistStorage()
    step = isStandalone() || (!isIos() && !installPrompt) ? 'ready' : 'install'
  }

  async function copySetup() {
    await navigator.clipboard.writeText(setupLink(location.href, setup))
    copied = true
  }

  async function install() {
    await installPrompt?.prompt()
    step = 'ready'
  }

  function finish() {
    app.setup = null
    app.screen = step === 'restored' ? 'home' : 'play'
  }
</script>

<main class="screen">
  <div class="row">
    <span class="spacer"></span>
    <LangToggle />
  </div>

  {#if step === 'restore'}
    <div class="card center stack pop">
      <div class="big">⏳</div>
      <p>{t('restoring')}</p>
    </div>
  {:else if step === 'restored'}
    <div class="card center stack pop">
      <div class="big">{THEMES[app.kid?.settings.theme ?? 'space'].avatar}</div>
      <h2>{app.kid?.name}</h2>
      <p>{t('restored')}</p>
      <button class="btn big" onclick={finish}>{t('letsGo')}</button>
    </div>
  {:else if step === 'theme'}
    <div class="center stack">
      <h1>{t('hello', { name: setup.n })}</h1>
      <h2>{t('pickTheme')}</h2>
      <p class="muted">{t('canChangeLater')}</p>
    </div>
    <ThemePicker selected={theme} onpick={pick} />
  {:else if step === 'install'}
    <div class="card stack">
      <h2>📲 {t('installTitle')}</h2>
      <p class="muted">{t('installWhy')}</p>
      {#if isIos()}
        <ol class="stack">
          <li>{t('installIos1')}</li>
          <li>{t('installIos2')}</li>
          <li>{t('installIos3')}</li>
        </ol>
        <button class="btn" onclick={copySetup}>{copied ? t('copied') : `📋 ${t('copy')}`}</button>
        <button class="btn ghost" onclick={() => (step = 'ready')}>{t('installContinue')}</button>
      {:else}
        <button class="btn" onclick={install}>{t('installButton')}</button>
        <button class="btn ghost" onclick={() => (step = 'ready')}>{t('installSkip')}</button>
      {/if}
    </div>
  {:else}
    <div class="card center stack pop">
      <div class="big">{THEMES[theme ?? 'space'].avatar}</div>
      <p>{t('placementIntro')}</p>
      <button class="btn big" onclick={finish}>{t('letsGo')}</button>
    </div>
  {/if}
</main>

<style>
  .big {
    font-size: 4rem;
  }
  ol {
    margin: 0;
    padding-left: 1.4em;
  }
</style>
