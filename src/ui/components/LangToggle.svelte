<script lang="ts">
  import type { Lang } from '../../core/types'
  import { app, saveKid } from '../../data/store.svelte'
  import { i18n, t } from '../../i18n/index.svelte'

  const LANGS: Lang[] = ['en', 'lt']

  function choose(lang: Lang) {
    i18n.lang = lang
    if (app.kid) {
      app.kid.settings.lang = lang
      void saveKid()
    }
  }
</script>

<div class="seg" role="group" aria-label={t('language')}>
  {#each LANGS as lang (lang)}
    <button class:on={i18n.lang === lang} onclick={() => choose(lang)}>{lang.toUpperCase()}</button>
  {/each}
</div>

<style>
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
