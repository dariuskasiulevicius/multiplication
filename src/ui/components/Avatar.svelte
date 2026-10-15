<script lang="ts">
  import { cosmetic } from '../../core/cosmetics'
  import type { CosmeticSlot } from '../../core/types'

  /** The Theme's avatar wearing the Kid's Cosmetics. `size` is in rem. */
  let { base, look, size = 2 }: { base: string; look: Partial<Record<CosmeticSlot, string>>; size?: number } = $props()

  const worn = (slot: CosmeticSlot) => {
    const id = look[slot]
    return id ? cosmetic(id)?.emoji : undefined
  }
  const hat = $derived(worn('hat'))
  const buddy = $derived(worn('buddy'))
  const sparkle = $derived(worn('sparkle'))
</script>

<span class="avatar" style="font-size: {size}rem" aria-hidden="true">
  {#if sparkle}<span class="sparkle">{sparkle}</span>{/if}
  <span class="base">{base}</span>
  {#if hat}<span class="hat">{hat}</span>{/if}
  {#if buddy}<span class="buddy">{buddy}</span>{/if}
</span>

<style>
  .avatar {
    position: relative;
    display: inline-grid;
    place-items: center;
    width: 1.25em;
    height: 1.25em;
    line-height: 1;
    flex-shrink: 0;
  }
  .base {
    font-size: 1em;
  }
  .hat {
    position: absolute;
    top: -0.38em;
    left: 50%;
    translate: -50% 0;
    font-size: 0.55em;
    rotate: -8deg;
  }
  .buddy {
    position: absolute;
    right: -0.3em;
    bottom: -0.1em;
    font-size: 0.5em;
  }
  .sparkle {
    position: absolute;
    left: -0.3em;
    top: -0.05em;
    font-size: 0.45em;
    animation: twinkle 2.4s ease-in-out infinite;
  }
  @keyframes twinkle {
    50% {
      transform: scale(1.25) rotate(12deg);
      opacity: 0.75;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sparkle {
      animation: none;
    }
  }
</style>
