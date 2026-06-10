import { describe, expect, it } from 'vitest'
import { extractPalette, kmeans, mulberry32 } from './kmeans'

function syntheticJars(): Uint8ClampedArray {
  // 60x60 image: quadrants of pink, green, yellow + white background strip
  const w = 60, h = 60
  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      let c: [number, number, number] = [250, 250, 250] // near-white, should be ignored
      if (y < 40) {
        if (x < 20) c = [244, 184, 193] // pink
        else if (x < 40) c = [46, 107, 62] // bottle green
        else c = [242, 199, 68] // golden yellow
      }
      rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = 255
    }
  }
  return rgba
}

describe('mulberry32', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43)
    const seqA = [a(), a(), a()], seqB = [b(), b(), b()]
    expect(seqA).toEqual(seqB)
    expect(seqA[0]).not.toBe(c())
  })
})

describe('kmeans', () => {
  it('is deterministic for the same seed', () => {
    const pts = new Float32Array(300)
    const rand = mulberry32(1)
    for (let i = 0; i < pts.length; i++) pts[i] = rand() * 255
    const r1 = kmeans(pts, 4, 7)
    const r2 = kmeans(pts, 4, 7)
    expect(r1.centers).toEqual(r2.centers)
    expect(r1.counts).toEqual(r2.counts)
  })
  it('handles empty input and k > n', () => {
    expect(kmeans(new Float32Array(0), 3).centers).toEqual([])
    expect(kmeans(new Float32Array([1, 2, 3]), 5).centers).toHaveLength(1)
  })
})

describe('extractPalette', () => {
  it('finds the three paint colors and ignores white background', () => {
    const rgba = syntheticJars()
    const colors = extractPalette(rgba, 6)
    expect(colors.length).toBeGreaterThanOrEqual(3)
    const hexes = colors.map((c) => c.hex)
    // each true paint color should be near one extracted swatch
    for (const target of [[244, 184, 193], [46, 107, 62], [242, 199, 68]]) {
      const near = hexes.some((hx) => {
        const n = parseInt(hx.slice(1), 16)
        const dr = ((n >> 16) & 255) - target[0]
        const dg = ((n >> 8) & 255) - target[1]
        const db = (n & 255) - target[2]
        return Math.sqrt(dr * dr + dg * dg + db * db) < 24
      })
      expect(near).toBe(true)
    }
    // no near-white swatch proposed
    for (const hx of hexes) {
      const n = parseInt(hx.slice(1), 16)
      const min = Math.min((n >> 16) & 255, (n >> 8) & 255, n & 255)
      expect(min).toBeLessThan(229)
    }
  })
  it('is deterministic', () => {
    const rgba = syntheticJars()
    expect(extractPalette(rgba, 6)).toEqual(extractPalette(rgba, 6))
  })
})
