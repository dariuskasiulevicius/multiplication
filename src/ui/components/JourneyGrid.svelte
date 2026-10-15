<script lang="ts">
  import { CHALLENGE_DAYS, gridCell, isWorldEnd, LEGEND_DAYS, worldOf, worldRange } from '../../core/journey'
  import type { ISODate, KidState } from '../../core/types'
  import { i18n, t } from '../../i18n/index.svelte'
  import type { Theme } from '../../themes'
  import { starText } from '../stars'

  let { kid, theme, date }: { kid: KidState; theme: Theme; date: ISODate } = $props()

  // Play Day number for each cell of the 10 × 10 grid.
  const DAY_AT: number[][] = Array.from({ length: 10 }, () => Array(10).fill(0))
  for (let d = 1; d <= LEGEND_DAYS; d++) {
    const { row, col } = gridCell(d)
    DAY_AT[row - 1][col - 1] = d
  }

  const played = $derived(kid.journey.playDays.length)
  const playedToday = $derived(kid.journey.playDays.at(-1) === date)
  /** Goal cell of the World the Kid is in now. */
  const nextGoal = $derived.by(() => {
    const w = worldOf(Math.min(played + 1, LEGEND_DAYS))
    return w ? worldRange(w)[1] : null
  })
  let picked = $state<number | null>(null)
  const shown = $derived(picked ?? nextGoal)
</script>

<div class="grid" role="img" aria-label="{played} / {CHALLENGE_DAYS}">
  {#each DAY_AT as row, r (r)}
    {#each row as day (day)}
      {@const done = day <= played}
      {@const next = day === played + 1 && !playedToday}
      {@const world = worldOf(day)}
      <div class="cell" class:done class:next class:legend={day > CHALLENGE_DAYS} class:alt={(world ?? 0) % 2 === 0}>
        {#if isWorldEnd(day) && world}
          <button
            class="medal"
            class:mystery={!done}
            class:current={day === nextGoal}
            aria-label={done ? theme.badges[world - 1].name[i18n.lang] : t('mysteryBadgeLabel')}
            onclick={() => (picked = picked === day ? null : day)}
          >
            {done ? theme.badges[world - 1].emoji : '?'}
          </button>
        {:else if done}
          <span class="stamp">{theme.stamp}</span>
        {:else if next}
          <span class="me">{theme.avatar}</span>
        {:else}
          <span class="n">{day}</span>
        {/if}
      </div>
    {/each}
  {/each}
</div>

{#if shown}
  {@const w = worldOf(shown) ?? 1}
  <p class="detail small center">
    {#if shown <= played}
      {theme.badges[w - 1].emoji} <b>{theme.badges[w - 1].name[i18n.lang]}</b> · {theme.worlds[w - 1].emoji}
      {theme.worlds[w - 1].name[i18n.lang]}
      {#if kid.trials[w]}<br />🏆 {t('round_trial')}: {starText(kid.trials[w].stars)}{/if}
    {:else}
      🎁 {t('mysteryBadge', { n: shown })}
    {/if}
  </p>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 3px;
  }
  .cell {
    aspect-ratio: 1;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.1);
    display: grid;
    place-items: center;
    font-size: clamp(0.55rem, 2.4vw, 0.75rem);
    color: var(--muted);
  }
  .cell.alt {
    background: rgba(255, 255, 255, 0.16);
  }
  .cell.legend {
    background: rgba(255, 255, 255, 0.04);
    outline: 1px dashed rgba(255, 255, 255, 0.15);
    outline-offset: -2px;
  }
  .cell.done {
    background: color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .cell.next {
    background: var(--accent);
    animation: pulse 1.4s ease-in-out infinite;
  }
  .stamp,
  .me {
    font-size: clamp(0.8rem, 3.6vw, 1.15rem);
  }
  .n {
    opacity: 0.5;
  }
  .medal {
    width: 88%;
    aspect-ratio: 1;
    border: 0;
    padding: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: clamp(0.75rem, 3.4vw, 1.1rem);
    font-weight: 900;
    color: #5a3d00;
    background: radial-gradient(circle at 30% 30%, #fff6c9, var(--gold) 55%, #b8860b);
    box-shadow: 0 0 8px color-mix(in srgb, var(--gold) 70%, transparent);
  }
  .medal.mystery {
    color: #fff;
    background: radial-gradient(circle at 30% 30%, #efeaff, #9b8cff 55%, #4b38b8);
    box-shadow: 0 0 6px rgba(155, 140, 255, 0.7);
    animation: glint 2.4s ease-in-out infinite;
  }
  .medal.mystery.current {
    animation:
      glint 1.6s ease-in-out infinite,
      wobble 2.2s ease-in-out infinite;
  }
  .detail {
    min-height: 2.6em;
    margin-top: 8px;
  }
  @keyframes pulse {
    50% {
      transform: scale(1.12);
    }
  }
  @keyframes glint {
    50% {
      filter: brightness(1.35);
    }
  }
  @keyframes wobble {
    0%,
    70%,
    100% {
      transform: rotate(0);
    }
    78% {
      transform: rotate(-14deg);
    }
    86% {
      transform: rotate(12deg);
    }
    94% {
      transform: rotate(-6deg);
    }
  }
</style>
