<script lang="ts">
  import { CHALLENGE_DAYS, gridCell, isWorldEnd, LEGEND_DAYS, worldOf } from '../../core/journey'
  import type { ISODate, KidState } from '../../core/types'
  import type { Theme } from '../../themes'

  let { kid, theme, date }: { kid: KidState; theme: Theme; date: ISODate } = $props()

  // Play Day number for each cell of the 10 × 10 grid.
  const DAY_AT: number[][] = Array.from({ length: 10 }, () => Array(10).fill(0))
  for (let d = 1; d <= LEGEND_DAYS; d++) {
    const { row, col } = gridCell(d)
    DAY_AT[row - 1][col - 1] = d
  }

  const played = $derived(kid.journey.playDays.length)
  const playedToday = $derived(kid.journey.playDays.at(-1) === date)
</script>

<div class="grid" role="img" aria-label="{played} / {CHALLENGE_DAYS}">
  {#each DAY_AT as row, r (r)}
    {#each row as day (day)}
      {@const done = day <= played}
      {@const next = day === played + 1 && !playedToday}
      {@const world = worldOf(day)}
      <div class="cell" class:done class:next class:legend={day > CHALLENGE_DAYS} class:alt={(world ?? 0) % 2 === 0}>
        {#if done}
          <span class="stamp">{theme.stamp}</span>
        {:else if next}
          <span class="me">{theme.avatar}</span>
        {:else if isWorldEnd(day) && world}
          <span class="goal">{theme.worlds[world - 1].emoji}</span>
        {:else}
          <span class="n">{day}</span>
        {/if}
      </div>
    {/each}
  {/each}
</div>

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
  .me,
  .goal {
    font-size: clamp(0.8rem, 3.6vw, 1.15rem);
  }
  .goal {
    opacity: 0.7;
  }
  .n {
    opacity: 0.5;
  }
  @keyframes pulse {
    50% {
      transform: scale(1.12);
    }
  }
</style>
