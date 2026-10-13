<script lang="ts">
  import { uid } from '../../core/rng'
  import { parseSetup } from '../../core/setupLink'
  import { app } from '../../data/store.svelte'
  import { i18n, t } from '../../i18n/index.svelte'
  import LangToggle from '../components/LangToggle.svelte'

  let pasting = $state(false)
  let pasted = $state('')
  let invalid = $state(false)
  let local = $state(false)
  let name = $state('')

  function useLink(text: string) {
    const setup = parseSetup(text)
    if (!setup) {
      invalid = true
      return
    }
    app.setup = setup
    app.screen = 'onboarding'
  }

  async function paste() {
    invalid = false
    try {
      const text = await navigator.clipboard.readText()
      if (parseSetup(text)) return useLink(text)
    } catch {
      // Clipboard blocked: fall back to the text field.
    }
    pasting = true
  }

  function playLocal(e: Event) {
    e.preventDefault()
    if (!name.trim()) return
    app.setup = { v: 1, k: uid(), n: name.trim(), u: '', s: '', l: i18n.lang }
    app.screen = 'onboarding'
  }
</script>

<main class="screen">
  <div class="row">
    <span class="spacer"></span>
    <LangToggle />
  </div>

  <div class="hero center stack">
    <div class="big">7 × 7</div>
    <h1>{t('appName')}</h1>
    <p class="muted">{t('welcomeTitle')}</p>
  </div>

  <div class="card stack">
    <p>🔗 {t('welcomeHasLink')}</p>
    <button class="btn" onclick={paste}>📋 {t('pasteSetup')}</button>
    {#if pasting}
      <textarea class="input" rows="3" placeholder={t('pastePlaceholder')} bind:value={pasted}></textarea>
      <button class="btn ghost" onclick={() => useLink(pasted)}>{t('next')}</button>
    {/if}
    {#if invalid}<p class="bad small">{t('pasteInvalid')}</p>{/if}
  </div>

  <div class="card stack">
    {#if local}
      <form class="stack" onsubmit={playLocal}>
        <input class="input" placeholder={t('yourName')} bind:value={name} maxlength="20" />
        <button class="btn" disabled={!name.trim()}>{t('start')}</button>
      </form>
    {:else}
      <button class="btn ghost" onclick={() => (local = true)}>🎮 {t('playWithoutSheet')}</button>
    {/if}
  </div>

  <span class="spacer"></span>
  <button class="btn ghost" onclick={() => (app.screen = 'parentSetup')}>👨‍👩‍👧 {t('forParents')}</button>
</main>

<style>
  .hero {
    margin: 24px 0 8px;
  }
  .big {
    font-size: 3.5rem;
    font-weight: 900;
    color: var(--accent);
  }
  .bad {
    color: var(--bad);
  }
</style>
