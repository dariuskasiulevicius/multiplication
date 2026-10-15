<script lang="ts">
  /** Bump `fire` to throw a burst of confetti. */
  let { fire = 0 }: { fire?: number } = $props()
  let canvas: HTMLCanvasElement | undefined = $state()

  const COLORS = ['#ffd34d', '#ff6b9a', '#6bdcff', '#7dff9b', '#c38bff', '#ffffff']

  $effect(() => {
    if (fire > 0 && canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) burst(canvas)
  })

  function burst(c: HTMLCanvasElement) {
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    c.width = innerWidth * dpr
    c.height = innerHeight * dpr
    ctx.scale(dpr, dpr)
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80,
      y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      size: 6 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))
    const start = performance.now()
    const frame = (now: number) => {
      const t = now - start
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      for (const p of parts) {
        p.vy += 0.35
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.spin
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - t / 2600)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      if (t < 2600) requestAnimationFrame(frame)
      else ctx.clearRect(0, 0, innerWidth, innerHeight)
    }
    requestAnimationFrame(frame)
  }
</script>

<canvas bind:this={canvas} class="confetti" aria-hidden="true"></canvas>

<style>
  .confetti {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 50;
  }
</style>
