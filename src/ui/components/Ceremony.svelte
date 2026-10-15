<script lang="ts">
  import { onMount } from 'svelte'
  import { sfx, vibrate } from '../../audio/sfx'
  import type { JourneyStats } from '../../core/kid'
  import { t } from '../../i18n/index.svelte'
  import Confetti from './Confetti.svelte'

  /** Finishing the Challenge (Play Day 49) or Legend (Play Day 100). */
  let { kind, stats, onclose }: { kind: 'challenge' | 'legend'; stats: JourneyStats; onclose: () => void } = $props()

  let fire = $state(0)
  const square = $derived(kind === 'challenge' ? 7 : 10)

  onMount(() => {
    sfx.dayDone()
    vibrate([60, 60, 60, 60, 200])
    fire++
    const again = setTimeout(() => fire++, 1400)
    return () => clearTimeout(again)
  })
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={kind === 'challenge' ? t('challengeDone') : t('legendDone')}>
  <div class="rays"></div>
  <div class="content stack center">
    <div class="trophy pop">{kind === 'challenge' ? '🏆' : '👑'}</div>
    <p class="square pop">{square} × {square} = {square * square}!</p>
    <h1 class="pop">{kind === 'challenge' ? t('challengeDone') : t('legendDone')}</h1>

    <ul class="card stats">
      <li>📅 {t('statDays', { n: stats.playDays })}</li>
      <li>{t('statGold', { n: stats.gold })}</li>
      {#if stats.diamond > 0}<li>{t('statDiamond', { n: stats.diamond })}</li>{/if}
      {#if stats.trialStars > 0}<li>{t('statTrials', { n: stats.trialStars })}</li>{/if}
      <li>{t('statFire', { n: stats.streak })}</li>
    </ul>

    {#if kind === 'challenge'}
      <div class="card next">
        <p><b>{t('legendNext')}</b></p>
        <ul>
          <li>⏱️ {t('legendRule1')}</li>
          <li>⚡ {t('legendRule2')}</li>
          <li>🗺️ {t('legendRule3')}</li>
        </ul>
      </div>
      <button class="btn big" onclick={onclose}>👑 {t('legendGo')}</button>
    {:else}
      <p class="card next">🎈 {t('freeNext')}</p>
      <button class="btn big" onclick={onclose}>🎉 {t('legendBye')}</button>
    {/if}
  </div>
  <Confetti {fire} />
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    overflow: auto;
    display: grid;
    place-items: center;
    padding: calc(env(safe-area-inset-top, 0px) + 24px) 20px calc(env(safe-area-inset-bottom, 0px) + 24px);
    background: radial-gradient(circle at 50% 30%, #5a3c0a, #0a0519);
  }
  .rays {
    position: fixed;
    left: 50%;
    top: 22%;
    width: 160vmax;
    height: 160vmax;
    translate: -50% -50%;
    background: repeating-conic-gradient(from 0deg, rgba(255, 220, 120, 0.14) 0deg 10deg, transparent 10deg 20deg);
    animation: spin 24s linear infinite;
    pointer-events: none;
  }
  .content {
    position: relative;
    align-items: center;
    max-width: 420px;
    width: 100%;
  }
  .trophy {
    font-size: 6rem;
    line-height: 1;
    filter: drop-shadow(0 0 24px rgba(255, 211, 77, 0.8));
  }
  .square {
    font-size: 2.4rem;
    font-weight: 900;
    color: var(--gold);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
    font-weight: 700;
  }
  .stats,
  .next {
    width: 100%;
    text-align: left;
    padding: 16px;
  }
  .next {
    font-weight: 700;
    display: grid;
    gap: 8px;
  }
  @keyframes spin {
    to {
      rotate: 360deg;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .rays {
      animation: none;
    }
  }
</style>
