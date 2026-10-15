<script lang="ts">
  import { worldOf, worldRange } from '../../core/journey'
  import { ceremonyFor, journeyStats, markRevealed } from '../../core/kid'
  import type { KidState } from '../../core/types'
  import { saveKid } from '../../data/store.svelte'
  import { i18n } from '../../i18n/index.svelte'
  import type { Theme } from '../../themes'
  import BadgeReveal from './BadgeReveal.svelte'
  import Ceremony from './Ceremony.svelte'

  /**
   * A completed World: its World Badge reveal, then the big ceremony after
   * Worlds 7 and 10. Marked as seen only at the very end, so if the app closes
   * first Home shows it again.
   */
  let {
    kid,
    theme,
    world,
    shield,
    onclose,
  }: { kid: KidState; theme: Theme; world: number; shield: boolean; onclose: () => void } = $props()

  let step = $state<'badge' | 'ceremony'>('badge')
  const ceremony = $derived(ceremonyFor(world))
  const name = (w: number) => `${theme.worlds[w - 1].emoji} ${theme.worlds[w - 1].name[i18n.lang]}`
  const next = $derived(world < 10 ? worldOf(worldRange(world)[1] + 1) : null)

  function done() {
    markRevealed(kid, world)
    void saveKid()
    onclose()
  }
</script>

{#if step === 'badge'}
  <BadgeReveal
    badge={theme.badges[world - 1]}
    world={name(world)}
    nextWorld={next ? name(next) : null}
    {shield}
    square={world >= 8 ? world : null}
    onclose={() => (ceremony ? (step = 'ceremony') : done())}
  />
{:else if ceremony}
  <Ceremony kind={ceremony} stats={journeyStats(kid)} onclose={done} />
{/if}
