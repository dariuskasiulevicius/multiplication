<script lang="ts">
  import { t } from '../../i18n/index.svelte'

  let { onpass, oncancel }: { onpass: () => void; oncancel: () => void } = $props()

  // Easy for an adult, hard for a 7-year-old.
  const a = 12 + Math.floor(Math.random() * 8)
  const b = 3 + Math.floor(Math.random() * 7)
  let value = $state('')
  let wrong = $state(false)

  function check(e: Event) {
    e.preventDefault()
    if (Number(value) === a * b) onpass()
    else {
      wrong = true
      value = ''
    }
  }
</script>

<form class="card stack center" onsubmit={check}>
  <h2>🔒 {t('gateTitle')}</h2>
  <p class="muted">{t('gateAsk')}</p>
  <p class="q" class:shake={wrong}>{a} × {b} = ?</p>
  <input class="input center" inputmode="numeric" autocomplete="off" bind:value />
  <div class="row">
    <button type="button" class="btn ghost" onclick={oncancel}>{t('back')}</button>
    <span class="spacer"></span>
    <button class="btn">{t('next')}</button>
  </div>
</form>

<style>
  .q {
    font-size: 2rem;
    font-weight: 800;
  }
</style>
