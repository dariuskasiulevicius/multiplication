<script lang="ts">
  import { onMount } from 'svelte'
  import { setSound } from './audio/sfx'
  import { parseSetup } from './core/setupLink'
  import { app, loadKid, saveKid, syncNow } from './data/store.svelte'
  import { detectLang, i18n } from './i18n/index.svelte'
  import { THEMES, themeStyle } from './themes'
  import Home from './ui/screens/Home.svelte'
  import Onboarding from './ui/screens/Onboarding.svelte'
  import ParentMenu from './ui/screens/ParentMenu.svelte'
  import ParentSetup from './ui/screens/ParentSetup.svelte'
  import Play from './ui/screens/Play.svelte'
  import Settings from './ui/screens/Settings.svelte'
  import Welcome from './ui/screens/Welcome.svelte'

  const theme = $derived(THEMES[app.kid?.settings.theme ?? 'space'])

  $effect(() => {
    setSound(app.kid?.settings.sound ?? true)
  })

  $effect(() => {
    document.documentElement.lang = i18n.lang
    document.body.style.background = theme.colors.bg1
  })

  onMount(() => {
    void start()
    const sync = () => void syncNow()
    const visible = () => document.visibilityState === 'visible' && sync()
    // A Setup Link opened in a tab that is already running only changes the hash.
    const hash = () => void route(location.hash, false)
    window.addEventListener('online', sync)
    window.addEventListener('hashchange', hash)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('hashchange', hash)
      document.removeEventListener('visibilitychange', visible)
    }
  })

  async function start() {
    app.kid = await loadKid()
    i18n.lang = app.kid?.settings.lang ?? detectLang()
    await route(location.hash, true)
    void syncNow()
  }

  async function route(hash: string, initial: boolean) {
    const setup = parseSetup(hash)
    if (hash) history.replaceState(null, '', location.pathname + location.search)
    if (setup?.l && !app.kid) i18n.lang = setup.l

    if (hash.startsWith('#parent')) {
      app.screen = 'parentSetup'
    } else if (setup && app.kid?.kidId === setup.k) {
      // Same Kid again: just refresh the Family Sheet connection.
      if (setup.u) app.kid.sync = { url: setup.u, secret: setup.s }
      await saveKid()
      app.screen = 'home'
    } else if (setup) {
      app.setup = setup
      app.screen = 'onboarding'
    } else if (initial) {
      app.screen = app.kid ? 'home' : 'welcome'
    }
  }
</script>

<div class="app" style="{themeStyle(theme)}; background: linear-gradient(170deg, {theme.colors.bg1}, {theme.colors.bg2}); color: {theme.colors.text}">
  {#if app.screen === 'welcome'}
    <Welcome />
  {:else if app.screen === 'parentSetup'}
    <ParentSetup />
  {:else if app.screen === 'onboarding'}
    <Onboarding />
  {:else if app.screen === 'home' && app.kid}
    <Home kid={app.kid} {theme} />
  {:else if app.screen === 'play' && app.kid}
    <Play kid={app.kid} {theme} />
  {:else if app.screen === 'settings' && app.kid}
    <Settings kid={app.kid} />
  {:else if app.screen === 'parent' && app.kid}
    <ParentMenu kid={app.kid} />
  {/if}
</div>
<!-- Solid backing under the iPhone status bar, so content never scrolls under it blurred. -->
<div class="status-backing" style="background: {theme.colors.bg1}"></div>

<style>
  .app {
    min-height: 100dvh;
  }
  .status-backing {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: env(safe-area-inset-top, 0px);
    z-index: 45;
    pointer-events: none;
  }
</style>
