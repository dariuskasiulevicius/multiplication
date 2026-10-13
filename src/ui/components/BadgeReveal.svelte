<script lang="ts">
  import { sfx, vibrate } from '../../audio/sfx'
  import { i18n, t } from '../../i18n/index.svelte'
  import type { Badge } from '../../themes'
  import Confetti from './Confetti.svelte'

  let {
    badge,
    world,
    nextWorld,
    shield,
    onclose,
  }: { badge: Badge; world: string; nextWorld: string | null; shield: boolean; onclose: () => void } = $props()

  let opened = $state(false)
  let fire = $state(0)

  function open() {
    if (opened) return
    opened = true
    fire++
    sfx.reveal()
    vibrate([30, 40, 30, 40, 120])
  }
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={t('worldCompleted', { world })}>
  <div class="rays" class:on={opened}></div>

  <div class="content center stack">
    <h1 class="pop">{opened ? t('congrats') : t('worldCompleted', { world })}</h1>

    <button class="coin" class:open={opened} onclick={open} aria-label={opened ? badge.name[i18n.lang] : t('tapToOpen')}>
      <span class="face front">?</span>
      <span class="face back">{badge.emoji}</span>
    </button>

    {#if !opened}
      <p class="hint">👆 {t('tapToOpen')}</p>
    {:else}
      <div class="earned stack pop">
        <p class="muted">{t('worldCompleted', { world })}</p>
        <p><b>{t('youEarned')}</b></p>
        <ul>
          <li>{badge.emoji} {t('badgeItem', { badge: badge.name[i18n.lang] })}</li>
          {#if shield}<li>🛡️ {t('shieldItem')}</li>{/if}
          {#if nextWorld}<li>🔓 {t('worldUnlocked', { world: nextWorld })}</li>{/if}
        </ul>
        <button class="btn big" onclick={onclose}>{t('awesome')}</button>
      </div>
    {/if}
  </div>

  <Confetti {fire} />
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 24px;
    background: radial-gradient(circle at 50% 40%, rgba(40, 20, 90, 0.97), rgba(5, 2, 20, 0.98));
    overflow: hidden;
  }
  .content {
    position: relative;
    align-items: center;
    max-width: 420px;
  }
  .rays {
    position: absolute;
    left: 50%;
    top: 40%;
    width: 160vmax;
    height: 160vmax;
    translate: -50% -50%;
    background: repeating-conic-gradient(from 0deg, rgba(255, 220, 120, 0.16) 0deg 10deg, transparent 10deg 20deg);
    opacity: 0;
    transition: opacity 0.6s;
    pointer-events: none;
  }
  .rays.on {
    opacity: 1;
    animation: spin 18s linear infinite;
  }
  .coin {
    position: relative;
    width: 168px;
    height: 168px;
    border: 0;
    padding: 0;
    background: none;
    transform-style: preserve-3d;
    transition: transform 0.9s cubic-bezier(0.2, 1.4, 0.4, 1);
    animation: shake 1.6s ease-in-out infinite;
  }
  .coin.open {
    transform: rotateY(180deg) scale(1.1);
    animation: none;
  }
  .face {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border: 6px solid rgba(255, 255, 255, 0.6);
  }
  .front {
    font-size: 5rem;
    font-weight: 900;
    color: #fff;
    background: radial-gradient(circle at 30% 30%, #efeaff, #9b8cff 55%, #4b38b8);
    box-shadow: 0 0 40px rgba(155, 140, 255, 0.8);
  }
  .back {
    transform: rotateY(180deg);
    font-size: 5.5rem;
    background: radial-gradient(circle at 30% 30%, #fff6c9, var(--gold) 55%, #b8860b);
    box-shadow: 0 0 60px rgba(255, 211, 77, 0.9);
  }
  .hint {
    font-size: 1.3rem;
    font-weight: 900;
    animation: breathe 1.2s ease-in-out infinite;
  }
  .earned {
    align-items: center;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 1.15rem;
    font-weight: 700;
    display: grid;
    gap: 6px;
  }
  @keyframes shake {
    0%,
    55%,
    100% {
      transform: rotate(0) scale(1);
    }
    62% {
      transform: rotate(-10deg) scale(1.05);
    }
    70% {
      transform: rotate(9deg) scale(1.05);
    }
    78% {
      transform: rotate(-6deg) scale(1.03);
    }
    86% {
      transform: rotate(4deg);
    }
  }
  @keyframes breathe {
    50% {
      transform: scale(1.08);
    }
  }
  @keyframes spin {
    to {
      rotate: 360deg;
    }
  }
</style>
