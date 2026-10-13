<script lang="ts">
  let { onDigit, onBack }: { onDigit: (d: number) => void; onBack: () => void } = $props()

  // pointerdown instead of click: answers are timed, so react on touch, not on release.
  function press(e: PointerEvent, fn: () => void) {
    e.preventDefault()
    fn()
  }
</script>

<div class="pad">
  {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as k (k)}
    <button class="key" onpointerdown={(e) => press(e, () => onDigit(k))}>{k}</button>
  {/each}
  <span></span>
  <button class="key" onpointerdown={(e) => press(e, () => onDigit(0))}>0</button>
  <button class="key back" aria-label="⌫" onpointerdown={(e) => press(e, onBack)}>⌫</button>
</div>

<style>
  .pad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
    max-width: 360px;
    margin: 0 auto;
    user-select: none;
    -webkit-user-select: none;
  }
  .key {
    height: clamp(56px, 9dvh, 76px);
    border: 0;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.14);
    font-size: 1.8rem;
    font-weight: 800;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
  }
  .key:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
    background: rgba(255, 255, 255, 0.24);
  }
  .back {
    font-size: 1.4rem;
  }
</style>
