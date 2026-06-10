/**
 * Generates /public/demo-relief.png — a synthetic photo of an unpainted clay
 * relief board (light circle with embossed ring-and-petal ridges), plus
 * /public/demo-palette.json. Pure Node, no native deps: ridges are stamped
 * into a height map along parametric paths, shaded with a directional light,
 * then encoded as PNG by hand (zlib + CRC32).
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZE = 1024
const CX = SIZE / 2
const CY = SIZE / 2
const BOARD_R = 470

// ---------- deterministic noise ----------
let seed = 20260610
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
const noiseGrid = new Float32Array(64 * 64).map(() => rand())
function smoothNoise(x, y) {
  const gx = ((x / SIZE) * 63) % 63
  const gy = ((y / SIZE) * 63) % 63
  const x0 = Math.floor(gx), y0 = Math.floor(gy)
  const fx = gx - x0, fy = gy - y0
  const n = (xi, yi) => noiseGrid[((yi % 64) * 64 + (xi % 64)) | 0]
  return (
    n(x0, y0) * (1 - fx) * (1 - fy) + n(x0 + 1, y0) * fx * (1 - fy) +
    n(x0, y0 + 1) * (1 - fx) * fy + n(x0 + 1, y0 + 1) * fx * fy
  )
}

// ---------- height map: stamp ridges along paths ----------
const height = new Float32Array(SIZE * SIZE)

function stamp(x, y, radius, amount) {
  const x0 = Math.max(0, Math.floor(x - radius * 2))
  const x1 = Math.min(SIZE - 1, Math.ceil(x + radius * 2))
  const y0 = Math.max(0, Math.floor(y - radius * 2))
  const y1 = Math.min(SIZE - 1, Math.ceil(y + radius * 2))
  const r2 = radius * radius
  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) {
      const d2 = (xx - x) ** 2 + (yy - y) ** 2
      const v = amount * Math.exp(-d2 / (2 * r2))
      const i = yy * SIZE + xx
      if (v > height[i]) height[i] = v // ropes overlap, they don't add up
    }
  }
}

function stampPath(fn, steps, radius, amount) {
  for (let i = 0; i <= steps; i++) {
    const [x, y] = fn(i / steps)
    stamp(x, y, radius, amount)
  }
}

const circle = (r) => (t) => [CX + Math.cos(t * 2 * Math.PI) * r, CY + Math.sin(t * 2 * Math.PI) * r]

// board rim + center rings
stampPath(circle(BOARD_R - 14), 2600, 7, 30)
stampPath(circle(150), 900, 7, 30)
stampPath(circle(105), 700, 6, 26)

// 12 petals between r=170 and r=420
const PETALS = 12
for (let p = 0; p < PETALS; p++) {
  const a = -Math.PI / 2 + (p * 2 * Math.PI) / PETALS
  const half = (Math.PI / PETALS) * 0.85
  const pt = (ang, r) => [CX + Math.cos(ang) * r, CY + Math.sin(ang) * r]
  const [bx0, by0] = pt(a - half, 170)
  const [bx1, by1] = pt(a + half, 170)
  const [tx, ty] = pt(a, 420)
  const [c0x, c0y] = pt(a - half * 1.25, 320)
  const [c1x, c1y] = pt(a + half * 1.25, 320)
  const quad = (p0, c, p1) => (t) => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
  ]
  stampPath(quad([bx0, by0], [c0x, c0y], [tx, ty]), 420, 7, 30)
  stampPath(quad([bx1, by1], [c1x, c1y], [tx, ty]), 420, 7, 30)
  // small inner dot per petal
  stamp(...pt(a, 240), 11, 24)
}

// ---------- shade and color ----------
const px = new Uint8Array(SIZE * SIZE * 4)
const LIGHT = [-0.62, -0.55, 0.56] // top-left light

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x
    const d = Math.hypot(x - CX, y - CY)
    let r, g, b
    if (d > BOARD_R) {
      // background: warm cloth with gentle folds
      const n = smoothNoise(x * 0.9 + 31, y * 0.9 + 7)
      const fold = Math.sin((x + y * 0.6) / 90) * 6
      r = 168 + n * 18 + fold
      g = 142 + n * 14 + fold
      b = 118 + n * 12 + fold
    } else {
      // clay board, shaded by the ridge height map
      const hL = height[i - 1] ?? 0
      const hR = height[i + 1] ?? 0
      const hU = height[i - SIZE] ?? 0
      const hD = height[i + SIZE] ?? 0
      const nx = (hL - hR) * 0.9
      const ny = (hU - hD) * 0.9
      const nz = 6
      const len = Math.hypot(nx, ny, nz)
      let lit = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / len
      lit = Math.max(0.25, lit)
      const n = smoothNoise(x * 2.3, y * 2.3)
      const vign = 1 - (d / BOARD_R) ** 2 * 0.13
      // raised areas slightly brighter (fresh clay), plus ambient occlusion at ridge feet
      const lift = Math.min(1, height[i] / 30)
      const base = 222 + lift * 10 + n * 9
      const k = (0.55 + lit * 0.78) * vign
      r = base * k
      g = (base - 9) * k
      b = (base - 30) * k
    }
    const o = i * 4
    px[o] = Math.max(0, Math.min(255, r))
    px[o + 1] = Math.max(0, Math.min(255, g))
    px[o + 2] = Math.max(0, Math.min(255, b))
    px[o + 3] = 255
  }
}

// ---------- PNG encode ----------
const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0 // filter none
  Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1)
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

const here = dirname(fileURLToPath(import.meta.url))
const pub = join(here, '..', 'public')
mkdirSync(pub, { recursive: true })
writeFileSync(join(pub, 'demo-relief.png'), png)

const palette = [
  { id: 'demo-mint', name: 'Mint', hex: '#BFD8D2' },
  { id: 'demo-pink', name: 'Pastel pink', hex: '#F4B8C1' },
  { id: 'demo-pistachio', name: 'Pistachio', hex: '#DCE6A0' },
  { id: 'demo-green', name: 'Bottle green', hex: '#2E6B3E' },
  { id: 'demo-yellow', name: 'Golden yellow', hex: '#F2C744' },
  { id: 'demo-lilac', name: 'Lilac', hex: '#C9C3E3' },
]
writeFileSync(join(pub, 'demo-palette.json'), JSON.stringify(palette, null, 2))

console.log(`Wrote public/demo-relief.png (${Math.round(png.length / 1024)} KB) and public/demo-palette.json`)
