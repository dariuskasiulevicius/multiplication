<script lang="ts">
  /** a rows × b dots, with a gap after every 5 to make counting easy. */
  let { a, b, size = 14 }: { a: number; b: number; size?: number } = $props()
</script>

<div class="grid" style="--size: {size}px" aria-label="{a} × {b}">
  {#each Array.from({ length: a }, (_, r) => r) as r (r)}
    <div class="line" class:gap={r === 4}>
      {#each Array.from({ length: b }, (_, c) => c) as c (c)}
        <span class="dot" class:gap={c === 4}></span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .grid {
    display: inline-flex;
    flex-direction: column;
    gap: calc(var(--size) * 0.3);
    padding: 8px;
  }
  .line {
    display: flex;
    gap: calc(var(--size) * 0.3);
  }
  .line.gap {
    margin-bottom: calc(var(--size) * 0.5);
  }
  .dot {
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .dot.gap {
    margin-right: calc(var(--size) * 0.5);
  }
</style>
