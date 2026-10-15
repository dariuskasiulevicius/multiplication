<script lang="ts">
  import { sfx, vibrate } from '../../audio/sfx'
  import { cosmetic } from '../../core/cosmetics'
  import type { ChestReward } from '../../core/types'
  import { t } from '../../i18n/index.svelte'
  import Confetti from './Confetti.svelte'

  /** The reward is already the Kid's; opening only shows it. */
  let { reward }: { reward: ChestReward } = $props()

  let opened = $state(false)
  let fire = $state(0)
  const item = $derived(reward.kind === 'cosmetic' ? cosmetic(reward.id)?.emoji ?? '🎁' : null)

  function open() {
    if (opened) return
    opened = true
    fire++
    sfx.reveal()
    vibrate([30, 40, 80])
  }
</script>

<div class="chest-box stack center">
  <p class="title">🎁 {t('chestTitle')}</p>
  <button class="chest" class:open={opened} onclick={open} aria-label={t('tapToOpen')}>
    {#if !opened}🎁{:else if item}{item}{:else}⭐{/if}
  </button>
  {#if !opened}
    <p class="hint">👆 {t('tapToOpen')}</p>
  {:else if reward.kind === 'stars'}
    <p class="won pop">{t('chestStars', { n: reward.n })}</p>
  {:else}
    <p class="won pop">{t('chestItem', { item: item ?? '' })}</p>
  {/if}
</div>
<Confetti {fire} />

<style>
  .chest-box {
    align-items: center;
    gap: 6px;
  }
  .title {
    font-weight: 900;
  }
  .chest {
    border: 0;
    background: none;
    font-size: 3.6rem;
    line-height: 1.1;
    padding: 0;
    animation: wiggle 1.4s ease-in-out infinite;
  }
  .chest.open {
    animation: popin 0.5s cubic-bezier(0.2, 1.6, 0.4, 1);
  }
  .hint {
    font-weight: 900;
  }
  .won {
    font-weight: 900;
    color: var(--gold);
    font-size: 1.15rem;
  }
  @keyframes wiggle {
    0%,
    60%,
    100% {
      transform: rotate(0);
    }
    70% {
      transform: rotate(-12deg) scale(1.08);
    }
    80% {
      transform: rotate(10deg) scale(1.08);
    }
    90% {
      transform: rotate(-5deg);
    }
  }
  @keyframes popin {
    from {
      transform: scale(0.3);
    }
    to {
      transform: scale(1);
    }
  }
</style>
