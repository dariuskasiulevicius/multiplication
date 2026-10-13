<script lang="ts">
  import qrcode from 'qrcode-generator'

  let { text }: { text: string } = $props()

  const svg = $derived.by(() => {
    const q = qrcode(0, 'L')
    q.addData(text)
    q.make()
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
  })
</script>

<div class="qr">{@html svg}</div>

<style>
  .qr {
    background: #fff;
    border-radius: 12px;
    padding: 6px;
    width: min(240px, 70vw);
    margin: 0 auto;
  }
  .qr :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
