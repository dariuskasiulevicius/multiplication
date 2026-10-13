<script lang="ts">
  /** Drains over Target Time; `id` restarts it for each question. */
  let { targetMs, id }: { targetMs: number; id: string | number } = $props()
</script>

{#key id}
  <div class="bar" aria-hidden="true">
    <div class="fill" style="animation-duration: {targetMs}ms"></div>
  </div>
{/key}

<style>
  .bar {
    width: min(320px, 80vw);
    height: 10px;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.12);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    width: 100%;
    transform-origin: left;
    animation-name: drain;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }
  @keyframes drain {
    0% {
      transform: scaleX(1);
      background: var(--good);
    }
    65% {
      background: var(--good);
    }
    100% {
      transform: scaleX(0);
      background: var(--gold);
    }
  }
</style>
