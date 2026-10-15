<script lang="ts">
  import { sfx, vibrate } from '../../audio/sfx'
  import { buy, COSMETICS, cosmetic, SLOTS, toggleWear } from '../../core/cosmetics'
  import type { KidState } from '../../core/types'
  import { app, saveKid } from '../../data/store.svelte'
  import { t, type Key } from '../../i18n/index.svelte'
  import type { Theme } from '../../themes'
  import Avatar from '../components/Avatar.svelte'
  import Confetti from '../components/Confetti.svelte'

  let { kid, theme }: { kid: KidState; theme: Theme } = $props()

  /** Item being looked at: shown on the avatar before buying. */
  let picked = $state<string | null>(null)
  let fire = $state(0)

  const item = $derived(picked ? cosmetic(picked) : undefined)
  const owned = $derived(item ? kid.owned.includes(item.id) : false)
  const preview = $derived(item ? { ...kid.look, [item.slot]: item.id } : kid.look)

  async function buyPicked() {
    if (!item || !buy(kid, item.id)) return
    sfx.buy()
    vibrate(40)
    fire++
    await saveKid()
  }

  async function wearPicked() {
    if (!item) return
    toggleWear(kid, item.id)
    sfx.tap()
    await saveKid()
  }
</script>

<main class="screen">
  <div class="row">
    <button class="icon-btn" aria-label={t('back')} onclick={() => (app.screen = 'home')}>←</button>
    <h1>🛍️ {t('shopTitle')}</h1>
    <span class="spacer"></span>
    <span class="pill balance" aria-label={t('stars')}>⭐ {kid.stars}</span>
  </div>

  <section class="card stage stack center">
    <Avatar base={theme.avatar} look={preview} size={5} />
    {#if !item}
      <p class="muted">{t('shopPick')}</p>
    {:else if owned}
      <button class="btn" onclick={wearPicked}>
        {kid.look[item.slot] === item.id ? t('shopTakeOff') : t('shopWear')}
      </button>
    {:else if kid.stars >= item.price}
      <button class="btn" onclick={buyPicked}>{t('shopBuy', { price: item.price })}</button>
    {:else}
      <p class="need">{t('shopNeed', { n: item.price - kid.stars })}</p>
    {/if}
  </section>

  {#each SLOTS as slot (slot)}
    <section class="card stack">
      <h2>{t(`slot_${slot}` as Key)}</h2>
      <div class="items">
        {#each COSMETICS.filter((c) => c.slot === slot) as c (c.id)}
          {@const has = kid.owned.includes(c.id)}
          <button
            class="item"
            class:picked={picked === c.id}
            class:worn={kid.look[slot] === c.id}
            class:dim={!has && kid.stars < c.price}
            aria-pressed={picked === c.id}
            onclick={() => (picked = picked === c.id ? null : c.id)}
          >
            <span class="emoji">{c.emoji}</span>
            <span class="price">{has ? (kid.look[slot] === c.id ? '✅' : '✓') : `⭐${c.price}`}</span>
          </button>
        {/each}
      </div>
    </section>
  {/each}

  <p class="card how">{t('shopHow')}</p>
</main>
<Confetti {fire} />

<style>
  .balance {
    font-size: 1.15rem;
    flex-shrink: 0;
  }
  .stage {
    align-items: center;
    padding-top: 34px;
    min-height: 210px;
    justify-content: center;
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 5;
    background: linear-gradient(170deg, var(--bg1), var(--bg2));
    border: 2px solid rgba(255, 255, 255, 0.12);
  }
  .need {
    font-weight: 800;
    color: var(--muted);
  }
  .items {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
    gap: 8px;
  }
  .item {
    border: 3px solid transparent;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px 4px;
    display: grid;
    justify-items: center;
    gap: 2px;
  }
  .item.worn {
    background: rgba(255, 255, 255, 0.25);
  }
  .item.picked {
    border-color: var(--accent);
  }
  .item.dim {
    opacity: 0.55;
  }
  .emoji {
    font-size: 2rem;
    line-height: 1.1;
  }
  .price {
    font-size: 0.8rem;
    font-weight: 800;
  }
  .how {
    font-weight: 600;
  }
</style>
