<script lang="ts">
  import { factId } from '../../core/facts'
  import { nextStep } from '../../core/mastery'
  import type { KidState } from '../../core/types'
  import { t } from '../../i18n/index.svelte'

  let { kid }: { kid: KidState } = $props()
  let picked = $state<string | null>(null)

  const N = Array.from({ length: 10 }, (_, i) => i + 1)
  const pickedFact = $derived(picked ? kid.facts[picked] : null)
  const ICON = { unseen: '', bronze: '🥉', silver: '🥈', gold: '🥇', diamond: '💎' } as const
  const step = $derived(pickedFact ? nextStep(pickedFact) : null)
</script>

<div class="board">
  <span class="corner">×</span>
  {#each N as b (b)}<span class="head">{b}</span>{/each}
  {#each N as a (a)}
    <span class="head">{a}</span>
    {#each N as b (b)}
      {@const f = kid.facts[factId(a, b)]}
      <button
        class="cell {f.tier}"
        class:dusty={f.dusty}
        class:picked={picked === factId(a, b)}
        aria-label="{a} × {b}: {t(`tier_${f.tier}`)}"
        onclick={() => (picked = picked === factId(a, b) ? null : factId(a, b))}
      >
        {#if f.tier !== 'unseen'}<span class="v">{a * b}</span><i>{ICON[f.tier]}</i>{/if}
      </button>
    {/each}
  {/each}
</div>

<div class="detail small center">
  {#if pickedFact && step}
    <p>
      <b>{pickedFact.a} × {pickedFact.b}{pickedFact.tier === 'unseen' ? '' : ` = ${pickedFact.a * pickedFact.b}`}</b>
      {#if pickedFact.tier !== 'unseen'}· {ICON[pickedFact.tier]} {t(`tier_${pickedFact.tier}`)}{/if}
    </p>
    {#if pickedFact.dusty}<p>💨 {t('dustyHint')}</p>{/if}
    <p class="next">
      {#if step.next === 'new'}{t('nextNew')}
      {:else if step.next === 'bronze'}{t('nextBronze')}
      {:else if step.next === 'silver'}{t('nextSilver')}
      {:else if step.next === 'gold'}{t('nextGold', { n: step.days })}
      {:else if step.next === 'diamond'}{t('nextDiamond', { n: step.days })}
      {:else}{t('nextMax')}{/if}
    </p>
  {:else}
    <ul class="guide">
      <li>{t('medalBronze')}</li>
      <li>{t('medalSilver')}</li>
      <li>{t('medalGold')}</li>
      <li>{t('medalDiamond')}</li>
    </ul>
    <p class="muted">👆 {t('boardHint')}</p>
  {/if}
</div>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    gap: 3px;
  }
  .head,
  .corner {
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 0.75rem;
    color: var(--muted);
  }
  .cell {
    aspect-ratio: 1;
    border: 0;
    border-radius: 7px;
    padding: 0;
    position: relative;
    background: rgba(255, 255, 255, 0.07);
    font-weight: 800;
    font-size: clamp(0.6rem, 2.6vw, 0.85rem);
    color: #2a1c05;
  }
  .cell i {
    position: absolute;
    top: -3px;
    right: -3px;
    font-style: normal;
    font-size: 0.55rem;
  }
  .bronze {
    background: var(--bronze);
  }
  .silver {
    background: var(--silver);
  }
  .gold {
    background: var(--gold);
    box-shadow: 0 0 8px color-mix(in srgb, var(--gold) 70%, transparent);
  }
  .diamond {
    background: linear-gradient(135deg, #e6fbff, var(--diamond), #c9b6ff);
    box-shadow: 0 0 10px var(--diamond);
  }
  .dusty {
    filter: grayscale(0.7) brightness(0.8);
  }
  .picked {
    outline: 2px solid #fff;
  }
  .detail {
    min-height: 2.6em;
    margin-top: 10px;
    display: grid;
    gap: 6px;
  }
  .next {
    font-weight: 800;
    color: var(--accent);
  }
  .guide {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
    text-align: left;
    font-weight: 600;
  }
</style>
