<script lang="ts">
  import { onMount } from 'svelte'
  import { today } from '../../core/dates'
  import { CHALLENGE_DAYS, LEGEND_DAYS, viewStreak, worldOf } from '../../core/journey'
  import { nextRound, pendingReveal, phaseFor, playDayNumber, trialRetry } from '../../core/kid'
  import type { KidState } from '../../core/types'
  import { applyUpdate } from '../../data/pwa'
  import { app, saveKid, syncNow } from '../../data/store.svelte'
  import { fetchSnapshot, fromSnapshot } from '../../data/sync'
  import { i18n, t } from '../../i18n/index.svelte'
  import type { Theme } from '../../themes'
  import Avatar from '../components/Avatar.svelte'
  import HelpSheet from '../components/HelpSheet.svelte'
  import JourneyGrid from '../components/JourneyGrid.svelte'
  import StickerBoard from '../components/StickerBoard.svelte'
  import WorldCelebration from '../components/WorldCelebration.svelte'
  import { starText } from '../stars'

  let { kid, theme }: { kid: KidState; theme: Theme } = $props()

  const date = today()
  let tab = $state<'journey' | 'stickers'>('journey')
  let helping = $state(false)
  let tip = $state<'fire' | 'shield' | null>(null)
  /** A World Badge reveal the Kid missed (the app closed before it was seen). */
  let missed = $state<number | null>(null)

  // The "How to play" sheet opens by itself the first time.
  onMount(() => {
    if (!kid.helpSeen) helping = true
    else missed = pendingReveal(kid)
  })

  // New versions install here, between Rounds, never mid-game.
  $effect(() => {
    if (app.updateReady) applyUpdate()
  })

  const streak = $derived(viewStreak(kid.journey, date))
  const dayNo = $derived(playDayNumber(kid, date))
  const phase = $derived(phaseFor(kid, date))
  const world = $derived(worldOf(Math.min(dayNo, LEGEND_DAYS)) ?? 10)
  const next = $derived(nextRound(kid, date))
  const retry = $derived(trialRetry(kid, date))

  const playLabel = $derived.by(() => {
    if (!next) return t('doneToday')
    if (!next.core) return `🎯 ${t('playBonus')}`
    if (next.kind === 'trial') return `🏆 ${t('round_trial')} (${next.index}/${next.total})`
    if (next.index === 1) return `▶ ${t('playStart')}`
    return `▶ ${t('playContinue', { done: next.index - 1, total: next.total })}`
  })

  function play(trial: number | null) {
    app.trialRetry = trial
    app.screen = 'play'
  }

  async function closeHelp() {
    helping = false
    if (!kid.helpSeen) {
      kid.helpSeen = true
      await saveKid()
    }
    missed = pendingReveal(kid)
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
    <button class="me" onclick={() => (app.screen = 'shop')} aria-label={t('shopTitle')}>
      <Avatar base={theme.avatar} look={kid.look} size={2} />
      <b>{kid.name}</b>
    </button>
    <span class="spacer"></span>
    <button class="pill" aria-label="{t('stars')}: {kid.stars}" onclick={() => (app.screen = 'shop')}>⭐ {kid.stars}</button>
    <!-- Free Play has no Streak pressure: no fire or Shields. -->
    {#if phase !== 'free'}
      <button class="pill" class:on={tip === 'fire'} aria-label={t('streak')} onclick={() => (tip = tip === 'fire' ? null : 'fire')}>
        🔥 {streak.streak}
      </button>
      <button class="pill" class:on={tip === 'shield'} aria-label={t('shields')} onclick={() => (tip = tip === 'shield' ? null : 'shield')}>
        🛡️ {kid.journey.shields}
      </button>
    {/if}
    <button class="icon-btn" aria-label={t('settingsTitle')} onclick={() => (app.screen = 'settings')}>⚙️</button>
  </header>

  {#if tip}
    <button class="bubble pop {tip}" onclick={() => (tip = null)}>
      {#if tip === 'fire'}
        {streak.streak > 0 ? t('tipFire', { n: streak.streak }) : t('tipFire0')}
        <span class="muted small">{t('helpFire')}</span>
      {:else}
        <b>🛡️ {t('tipShields', { n: kid.journey.shields })}</b>
        <span class="muted small">{t('helpShield')}</span>
      {/if}
    </button>
  {/if}

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

  {#if phase === 'free'}
    <!-- nothing to keep burning -->
  {:else if !streak.playedToday && streak.shieldsNeeded > 0}
    <p class="note">🛡️ {t('shieldsWillCover', { n: streak.shieldsNeeded })}</p>
  {:else if streak.broken}
    <p class="note">🌱 {t('streakBroken')}</p>
  {/if}

  <button class="btn big play" disabled={!next || kid.inactive} onclick={() => play(null)}>
    {playLabel}
  </button>
  {#if retry && !kid.inactive}
    <button class="btn ghost" onclick={() => play(retry)}>🏆 {t('trialAgain')} · {starText(kid.trials[retry]?.stars ?? 0)}</button>
  {/if}

  <div class="tabs">
    <button class:on={tab === 'journey'} onclick={() => (tab = 'journey')}>🗺️ {t('journey')}</button>
    <button class:on={tab === 'stickers'} onclick={() => (tab = 'stickers')}>🏅 {t('stickers')}</button>
  </div>

  <section class="card">
    {#if tab === 'journey'}
      <JourneyGrid {kid} {theme} {date} />
    {:else}
      <StickerBoard {kid} />
    {/if}
  </section>
</main>

{#if helping}
  <HelpSheet onclose={closeHelp} />
{:else if missed}
  <WorldCelebration {kid} {theme} world={missed} shield={false} onclose={() => (missed = null)} />
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
    border: 0;
  }
  header .pill.on {
    background: rgba(255, 255, 255, 0.3);
  }
  .bubble {
    position: relative;
    border: 0;
    text-align: left;
    display: grid;
    gap: 6px;
    padding: 14px 16px;
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.95);
    color: #1d1442;
    font-weight: 700;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
  .bubble::before {
    content: '';
    position: absolute;
    top: -8px;
    right: 120px;
    border: 8px solid transparent;
    border-top: 0;
    border-bottom-color: rgba(255, 255, 255, 0.95);
  }
  /* Arrow under the pill that was tapped (header items are right-aligned). */
  .bubble.fire::before {
    right: 176px;
  }
  .bubble .muted {
    color: #4a4270;
    font-weight: 600;
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
</style>
