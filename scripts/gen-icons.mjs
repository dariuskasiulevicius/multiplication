// Draws the app icons (a gold × on a night-sky square) as PNGs, no dependencies.
// Run: npm run icons
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const TOP = [0x2b, 0x1f, 0x6b]
const BOTTOM = [0x12, 0x0f, 0x3a]
const GOLD = [0xff, 0xcc, 0x33]

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function insideRoundedSquare(x, y, r) {
  const cx = Math.min(Math.max(x, r), 1 - r)
  const cy = Math.min(Math.max(y, r), 1 - r)
  return Math.hypot(x - cx, y - cy) <= r
}

/** `radius` 0 = full square (maskable / Apple); `scale` shrinks the × into the safe zone. */
function draw(size, { radius, scale }) {
  const out = Buffer.alloc(size * size * 4)
  const SS = 4
  const half = 0.2 * scale
  const width = 0.065 * scale
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0
      let mark = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size
          const v = (y + (sy + 0.5) / SS) / size
          if (radius === 0 || insideRoundedSquare(u, v, radius)) bg++
          const d = Math.min(
            distToSegment(u, v, 0.5 - half, 0.5 - half, 0.5 + half, 0.5 + half),
            distToSegment(u, v, 0.5 + half, 0.5 - half, 0.5 - half, 0.5 + half),
          )
          if (d <= width) mark++
        }
      }
      const a = bg / (SS * SS)
      const m = mark / (SS * SS)
      const tY = y / size
      const i = (y * size + x) * 4
      for (let c = 0; c < 3; c++) {
        const sky = TOP[c] + (BOTTOM[c] - TOP[c]) * tY
        out[i + c] = Math.round(sky * (1 - m) + GOLD[c] * m)
      }
      out[i + 3] = Math.round(Math.max(a, m) * 255)
    }
  }
  return png(size, out)
}

const pub = new URL('../public/', import.meta.url)
writeFileSync(new URL('icon-192.png', pub), draw(192, { radius: 0.22, scale: 1 }))
writeFileSync(new URL('icon-512.png', pub), draw(512, { radius: 0.22, scale: 1 }))
writeFileSync(new URL('icon-maskable-512.png', pub), draw(512, { radius: 0, scale: 0.75 }))
writeFileSync(new URL('apple-touch-icon.png', pub), draw(180, { radius: 0, scale: 0.9 }))
writeFileSync(
  new URL('favicon.svg', pub),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1f6b"/><stop offset="1" stop-color="#120f3a"/></linearGradient></defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="M19 19 L45 45 M45 19 L19 45" stroke="#ffcc33" stroke-width="8.5" stroke-linecap="round"/>
</svg>
`,
)
console.log('icons written to public/')
