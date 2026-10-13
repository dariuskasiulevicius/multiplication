<script lang="ts">
  import { factId } from '../../core/facts'
  import type { KidState } from '../../core/types'
  import { t } from '../../i18n/index.svelte'

  let { kid }: { kid: KidState } = $props()
  let picked = $state<string | null>(null)

  const N = Array.from({ length: 10 }, (_, i) => i + 1)
  const pickedFact = $derived(picked ? kid.facts[picked] : null)
  const ICON = { unseen: '', bronze: '●', silver: '◆', gold: '★', diamond: '✦' } as const
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

<p class="detail small center">
  {#if pickedFact}
    <b>{pickedFact.a} × {pickedFact.b}{pickedFact.tier === 'unseen' ? '' : ` = ${pickedFact.a * pickedFact.b}`}</b>
    · {t(`tier_${pickedFact.tier}`)}
    {#if pickedFact.dusty}<br />💨 {t('dustyHint')}{/if}
  {:else}
    <span class="muted">● {t('tier_bronze')} · ◆ {t('tier_silver')} · ★ {t('tier_gold')} · ✦ {t('tier_diamond')}</span>
  {/if}
</p>

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
    top: 0;
    right: 2px;
    font-style: normal;
    font-size: 0.5rem;
    opacity: 0.7;
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
    margin-top: 8px;
  }
</style>
