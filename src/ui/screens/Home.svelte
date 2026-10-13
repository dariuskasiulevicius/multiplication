<script lang="ts">
  import { today } from '../../core/dates'
  import { CHALLENGE_DAYS, LEGEND_DAYS, viewStreak, worldOf } from '../../core/journey'
  import { nextRound, phaseFor, playDayNumber } from '../../core/kid'
  import type { KidState, ThemeId } from '../../core/types'
  import { applyUpdate } from '../../data/pwa'
  import { app, saveKid, syncNow } from '../../data/store.svelte'
  import { fetchSnapshot, fromSnapshot } from '../../data/sync'
  import { i18n, t } from '../../i18n/index.svelte'
  import type { Theme } from '../../themes'
  import JourneyGrid from '../components/JourneyGrid.svelte'
  import LangToggle from '../components/LangToggle.svelte'
  import StickerBoard from '../components/StickerBoard.svelte'
  import ThemePicker from '../components/ThemePicker.svelte'

  let { kid, theme }: { kid: KidState; theme: Theme } = $props()

  const date = today()
  let tab = $state<'journey' | 'stickers'>('journey')
  let picking = $state(false)

  // New versions install here, between Rounds, never mid-game.
  $effect(() => {
    if (app.updateReady) applyUpdate()
  })

  const streak = $derived(viewStreak(kid.journey, date))
  const dayNo = $derived(playDayNumber(kid, date))
  const phase = $derived(phaseFor(kid, date))
  const world = $derived(worldOf(Math.min(dayNo, LEGEND_DAYS)) ?? 10)
  const next = $derived(nextRound(kid, date))

  const playLabel = $derived.by(() => {
    if (!next) return t('doneToday')
    if (!next.core) return `⭐ ${t('playBonus')}`
    if (next.index === 1) return `▶ ${t('playStart')}`
    return `▶ ${t('playContinue', { done: next.index - 1, total: next.total })}`
  })

  async function changeTheme(id: ThemeId) {
    kid.settings.theme = id
    picking = false
    await saveKid()
  }

  async function moveHere() {
    if (!kid.sync) return
    const res = await fetchSnapshot(kid.sync, kid.kidId, kid.deviceId, kid.name, true)
    const restored = res.ok && res.snapshot ? fromSnapshot(res.snapshot, kid) : null
    if (restored) app.kid = restored
    else if (res.ok) kid.inactive = false
    await saveKid()
    void syncNow()
  }
</script>

<main class="screen">
  <header class="row">
    <button class="me" onclick={() => (picking = true)} aria-label={t('changeTheme')}>
      <span class="avatar">{theme.avatar}</span>
      <b>{kid.name}</b>
    </button>
    <span class="spacer"></span>
    <span class="pill" title={t('streak')}>🔥 {streak.streak}</span>
    <span class="pill" title={t('shields')}>🛡️ {kid.journey.shields}</span>
    <LangToggle compact />
    <button class="icon-btn" aria-label={t('parentMenu')} onclick={() => (app.screen = 'parent')}>⚙️</button>
  </header>

  {#if kid.inactive}
    <div class="card stack center">
      <p>📱 {t('inactive')}</p>
      <button class="btn" onclick={moveHere}>{t('moveHere')}</button>
    </div>
  {/if}

  <section class="card world">
    <span class="w-emoji">{theme.worlds[world - 1].emoji}</span>
    <div>
      <p class="muted small">
        {phase === 'legend' ? `👑 ${t('legend')} · ` : ''}{phase === 'free' ? t('freePlay') : t('worldN', { n: world })}
      </p>
      <h2>{theme.worlds[world - 1].name[i18n.lang]}</h2>
      <p class="muted small">
        {phase === 'free'
          ? t('playDayFree', { n: dayNo })
          : t('playDayOf', { n: dayNo, total: phase === 'challenge' ? CHALLENGE_DAYS : LEGEND_DAYS })}
      </p>
    </div>
  </section>

  {#if !streak.playedToday && streak.shieldsNeeded > 0}
    <p class="note">🛡️ {t('shieldsWillCover', { n: streak.shieldsNeeded })}</p>
  {:else if streak.broken}
    <p class="note">🌱 {t('streakBroken')}</p>
  {/if}

  <button class="btn big play" disabled={!next || kid.inactive} onclick={() => (app.screen = 'play')}>
    {playLabel}
  </button>

  <div class="tabs">
    <button class:on={tab === 'journey'} onclick={() => (tab = 'journey')}>🗺️ {t('journey')}</button>
    <button class:on={tab === 'stickers'} onclick={() => (tab = 'stickers')}>⭐ {t('stickers')}</button>
  </div>

  <section class="card">
    {#if tab === 'journey'}
      <JourneyGrid {kid} {theme} {date} />
    {:else}
      <StickerBoard {kid} />
    {/if}
  </section>
</main>

{#if picking}
  <div class="sheet" role="dialog" aria-modal="true">
    <div class="screen">
      <div class="row">
        <h2>{t('changeTheme')}</h2>
        <span class="spacer"></span>
        <button class="icon-btn" aria-label={t('close')} onclick={() => (picking = false)}>✕</button>
      </div>
      <ThemePicker selected={kid.settings.theme} onpick={changeTheme} />
    </div>
  </div>
{/if}

<style>
  header {
    gap: 6px;
  }
  /* Only the name may shrink on narrow phones. */
  header > :global(:not(.me)) {
    flex-shrink: 0;
  }
  header .pill {
    white-space: nowrap;
    padding: 6px 10px;
  }
  .me {
    min-width: 0;
    border: 0;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    font-size: 1.1rem;
  }
  .me b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .avatar {
    font-size: 2rem;
  }
  .world {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .w-emoji {
    font-size: 2.6rem;
  }
  .note {
    text-align: center;
    font-weight: 700;
  }
  .play {
    width: 100%;
  }
  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .tabs button {
    border: 0;
    border-radius: 14px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.08);
    font-weight: 700;
  }
  .tabs button.on {
    background: rgba(255, 255, 255, 0.22);
  }
  .sheet {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    z-index: 20;
    overflow: auto;
  }
</style>
