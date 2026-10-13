<script lang="ts">
  import type { KidState, Lang, ThemeId } from '../../core/types'
  import { app, saveKid } from '../../data/store.svelte'
  import { i18n, t } from '../../i18n/index.svelte'
  import HelpSheet from '../components/HelpSheet.svelte'
  import ThemePicker from '../components/ThemePicker.svelte'

  let { kid }: { kid: KidState } = $props()
  let helping = $state(false)

  // Language names are written in their own language.
  const LANGS: { lang: Lang; label: string }[] = [
    { lang: 'en', label: '🇬🇧 English' },
    { lang: 'lt', label: '🇱🇹 Lietuvių' },
  ]

  async function setLang(lang: Lang) {
    i18n.lang = lang
    kid.settings.lang = lang
    await saveKid()
  }

  async function setSound(on: boolean) {
    kid.settings.sound = on
    await saveKid()
  }

  async function setTheme(id: ThemeId) {
    kid.settings.theme = id
    await saveKid()
  }
</script>

<main class="screen">
  <div class="row">
    <button class="icon-btn" aria-label={t('back')} onclick={() => (app.screen = 'home')}>←</button>
    <h1>⚙️ {t('settingsTitle')}</h1>
  </div>

  <button class="btn big" onclick={() => (helping = true)}>❓ {t('helpButton')}</button>

  <section class="card stack">
    <h2>🌍 {t('language')}</h2>
    <div class="two">
      {#each LANGS as l (l.lang)}
        <button class="opt" class:on={i18n.lang === l.lang} aria-pressed={i18n.lang === l.lang} onclick={() => setLang(l.lang)}>
          {l.label}
        </button>
      {/each}
    </div>
  </section>

  <section class="card stack">
    <h2>🔊 {t('sound')}</h2>
    <div class="two">
      <button class="opt" class:on={kid.settings.sound} aria-pressed={kid.settings.sound} onclick={() => setSound(true)}>
        🔊 {t('soundOn')}
      </button>
      <button class="opt" class:on={!kid.settings.sound} aria-pressed={!kid.settings.sound} onclick={() => setSound(false)}>
        🔇 {t('soundOff')}
      </button>
    </div>
  </section>

  <section class="card stack">
    <h2>🎨 {t('adventure')}</h2>
    <ThemePicker selected={kid.settings.theme} onpick={setTheme} />
  </section>

  <button class="parent-link" onclick={() => (app.screen = 'parent')}>🔒 {t('parentLink')}</button>
</main>

{#if helping}
  <HelpSheet onclose={() => (helping = false)} />
{/if}

<style>
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .opt {
    border: 3px solid transparent;
    border-radius: 16px;
    padding: 16px 10px;
    font-size: 1.15rem;
    font-weight: 800;
    background: rgba(255, 255, 255, 0.1);
  }
  .opt.on {
    background: var(--accent);
    color: var(--accent-text);
    border-color: #fff;
  }
  .parent-link {
    align-self: center;
    margin-top: 8px;
    border: 0;
    background: none;
    padding: 8px;
    font-size: 0.85rem;
    color: var(--muted);
    text-decoration: underline;
  }
</style>
