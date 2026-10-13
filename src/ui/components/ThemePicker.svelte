<script lang="ts">
  import type { ThemeId } from '../../core/types'
  import { i18n } from '../../i18n/index.svelte'
  import { THEME_IDS, THEMES } from '../../themes'

  let { selected = null, onpick }: { selected?: ThemeId | null; onpick: (id: ThemeId) => void } = $props()
</script>

<div class="themes">
  {#each THEME_IDS as id (id)}
    {@const th = THEMES[id]}
    <button
      class="theme"
      class:on={selected === id}
      style="background: linear-gradient(160deg, {th.colors.bg1}, {th.colors.bg2}); color: {th.colors.text}"
      onclick={() => onpick(id)}
    >
      <span class="avatar">{th.avatar}</span>
      <span class="name">{th.name[i18n.lang]}</span>
      <span class="worlds">{th.worlds.slice(0, 7).map((w) => w.emoji).join(' ')}</span>
    </button>
  {/each}
</div>

<style>
  .themes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .theme {
    border: 3px solid transparent;
    border-radius: var(--radius);
    padding: 18px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }
  .theme.on {
    border-color: #fff;
  }
  .avatar {
    font-size: 3rem;
  }
  .name {
    font-weight: 800;
  }
  .worlds {
    font-size: 0.8rem;
    letter-spacing: 1px;
  }
</style>
