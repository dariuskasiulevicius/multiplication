<script lang="ts">
  import type { Lang } from '../../core/types'
  import { app, saveKid } from '../../data/store.svelte'
  import { i18n, t } from '../../i18n/index.svelte'

  /** `compact`: one round button showing the current language; a tap switches to the other. */
  let { compact = false }: { compact?: boolean } = $props()

  const LANGS: Lang[] = ['en', 'lt']

  function choose(lang: Lang) {
    i18n.lang = lang
    if (app.kid) {
      app.kid.settings.lang = lang
      void saveKid()
    }
  }
</script>

{#if compact}
  <button class="icon-btn code" aria-label={t('language')} onclick={() => choose(i18n.lang === 'en' ? 'lt' : 'en')}>
    {i18n.lang.toUpperCase()}
  </button>
{:else}
  <div class="seg" role="group" aria-label={t('language')}>
    {#each LANGS as lang (lang)}
      <button class:on={i18n.lang === lang} onclick={() => choose(lang)}>{lang.toUpperCase()}</button>
    {/each}
  </div>
{/if}

<style>
  .code {
    font-size: 0.85rem;
    font-weight: 900;
    letter-spacing: 0.5px;
  }
  .seg {
    display: inline-flex;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 3px;
  }
  .seg button {
    border: 0;
    background: transparent;
    border-radius: 999px;
    padding: 6px 12px;
    font-weight: 800;
    font-size: 0.85rem;
  }
  .seg button.on {
    background: var(--accent);
    color: var(--accent-text);
  }
</style>
