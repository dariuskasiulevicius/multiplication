<script lang="ts">
  import { onMount } from 'svelte'
  import { uid } from '../../core/rng'
  import { setupLink } from '../../core/setupLink'
  import { app, loadParent, saveParent, type ParentConfig } from '../../data/store.svelte'
  import { initSheet } from '../../data/sync'
  import { GUIDE_URL } from '../../config'
  import { i18n, t } from '../../i18n/index.svelte'
  import LangToggle from '../components/LangToggle.svelte'
  import QrCode from '../components/QrCode.svelte'

  let cfg = $state<ParentConfig>({ url: '', secret: '', kids: [] })
  let status = $state<'idle' | 'connecting' | 'connected' | 'mismatch' | 'error'>('idle')
  let error = $state('')
  let newName = $state('')
  let copiedId = $state<string | null>(null)
  let qrFor = $state<string | null>(null)

  onMount(async () => {
    const saved = await loadParent()
    if (saved) {
      cfg = saved
      if (saved.url && saved.secret) await connect()
    }
  })

  function randomSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(18))
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_')
  }

  async function connect() {
    cfg.url = cfg.url.trim()
    if (!cfg.url) return
    cfg.secret ||= randomSecret()
    status = 'connecting'
    const res = await initSheet({ url: cfg.url, secret: cfg.secret })
    if (res.ok) {
      status = 'connected'
      await saveParent(cfg)
    } else if (res.error === 'secret_mismatch' || res.error === 'bad_secret') {
      status = 'mismatch'
    } else {
      status = 'error'
      error = res.error === 'network' ? t('networkError') : (res.error ?? '')
    }
  }

  async function addKid(e: Event) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    cfg.kids.push({ kidId: uid(), name })
    newName = ''
    await saveParent(cfg)
  }

  async function removeKid(kidId: string) {
    cfg.kids = cfg.kids.filter((k) => k.kidId !== kidId)
    await saveParent(cfg)
  }

  function linkFor(kid: { kidId: string; name: string }): string {
    const connected = status === 'connected'
    return setupLink(location.origin + location.pathname, {
      v: 1,
      k: kid.kidId,
      n: kid.name,
      u: connected ? cfg.url : '',
      s: connected ? cfg.secret : '',
      l: i18n.lang,
    })
  }

  async function copy(kid: { kidId: string; name: string }) {
    await navigator.clipboard.writeText(linkFor(kid))
    copiedId = kid.kidId
  }

  async function share(kid: { kidId: string; name: string }) {
    try {
      await navigator.share({ title: `${t('appName')} — ${kid.name}`, url: linkFor(kid) })
    } catch {
      // Share sheet closed.
    }
  }
</script>

<main class="screen">
  <div class="row">
    <button class="icon-btn" aria-label={t('back')} onclick={() => (app.screen = app.kid ? 'home' : 'welcome')}>←</button>
    <h1>{t('psTitle')}</h1>
    <span class="spacer"></span>
    <LangToggle />
  </div>

  <section class="card stack">
    <h2>{t('psStep1')}</h2>
    <p class="muted small">{t('psStep1Help')}</p>
    <a class="link" href={GUIDE_URL} target="_blank" rel="noopener">📖 {t('guideLink')}</a>
    <input
      class="input"
      placeholder={t('scriptUrl')}
      bind:value={cfg.url}
      inputmode="url"
      autocomplete="off"
      disabled={status === 'connected'}
    />
    {#if status === 'mismatch'}
      <p class="small">{t('secretMismatch')}</p>
      <input class="input" placeholder={t('secret')} bind:value={cfg.secret} autocomplete="off" />
    {/if}
    {#if status === 'error'}<p class="small bad">{error}</p>{/if}
    {#if status === 'connected'}
      <p class="good">{t('connected')}</p>
    {:else}
      <button class="btn" disabled={!cfg.url.trim() || status === 'connecting'} onclick={connect}>
        {status === 'connecting' ? t('connecting') : t('connect')}
      </button>
    {/if}
  </section>

  <section class="card stack">
    <h2>{t('psStep2')}</h2>
    <form class="row" onsubmit={addKid}>
      <input class="input" placeholder={t('kidName')} bind:value={newName} maxlength="20" />
      <button class="btn" disabled={!newName.trim()}>{t('addKid')}</button>
    </form>
    {#if status !== 'connected'}<p class="muted small">⚠️ {t('noSheetWarning')}</p>{/if}
    {#if cfg.kids.length}<p class="muted small">{t('psLinksHelp')}</p>{/if}
    {#each cfg.kids as kid (kid.kidId)}
      <div class="kid stack">
        <div class="row">
          <b>{kid.name}</b>
          <span class="spacer"></span>
          <button class="btn ghost small-btn" onclick={() => removeKid(kid.kidId)}>{t('removeKid')}</button>
        </div>
        <div class="row wrap">
          <button class="btn small-btn" onclick={() => copy(kid)}>{copiedId === kid.kidId ? t('copied') : t('copyLink')}</button>
          {#if 'share' in navigator}
            <button class="btn ghost small-btn" onclick={() => share(kid)}>{t('share')}</button>
          {/if}
          <button class="btn ghost small-btn" onclick={() => (qrFor = qrFor === kid.kidId ? null : kid.kidId)}>QR</button>
        </div>
        {#if qrFor === kid.kidId}<QrCode text={linkFor(kid)} />{/if}
      </div>
    {/each}
  </section>
</main>

<style>
  .link {
    color: var(--accent);
    font-weight: 700;
  }
  .good {
    color: var(--good);
    font-weight: 800;
  }
  .bad {
    color: var(--bad);
  }
  .kid {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 12px;
  }
  .wrap {
    flex-wrap: wrap;
  }
  .small-btn {
    padding: 8px 14px;
    font-size: 0.95rem;
  }
</style>
