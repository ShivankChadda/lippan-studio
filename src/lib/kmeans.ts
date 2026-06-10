import { rgbToHex, rgbToHsl } from './color'

/** Deterministic PRNG so palette extraction is reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface KMeansResult { centers: number[][]; counts: number[] }

/** k-means++ over RGB points (flat [r,g,b,...]), seeded and deterministic. */
export function kmeans(points: Float32Array, k: number, seed = 7, iterations = 24): KMeansResult {
  const n = points.length / 3
  if (n === 0) return { centers: [], counts: [] }
  k = Math.min(k, n)
  const rand = mulberry32(seed)
  const centers: number[][] = []

  // k-means++ init
  const first = Math.floor(rand() * n)
  centers.push([points[first * 3], points[first * 3 + 1], points[first * 3 + 2]])
  const d2 = new Float32Array(n).fill(Infinity)
  while (centers.length < k) {
    const c = centers[centers.length - 1]
    let sum = 0
    for (let i = 0; i < n; i++) {
      const dr = points[i * 3] - c[0], dg = points[i * 3 + 1] - c[1], db = points[i * 3 + 2] - c[2]
      const d = dr * dr + dg * dg + db * db
      if (d < d2[i]) d2[i] = d
      sum += d2[i]
    }
    let target = rand() * sum
    let pick = n - 1
    for (let i = 0; i < n; i++) {
      target -= d2[i]
      if (target <= 0) { pick = i; break }
    }
    centers.push([points[pick * 3], points[pick * 3 + 1], points[pick * 3 + 2]])
  }

  const assign = new Int32Array(n)
  const counts = new Array<number>(k).fill(0)
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false
    for (let i = 0; i < n; i++) {
      let best = 0, bestD = Infinity
      for (let c = 0; c < k; c++) {
        const dr = points[i * 3] - centers[c][0]
        const dg = points[i * 3 + 1] - centers[c][1]
        const db = points[i * 3 + 2] - centers[c][2]
        const d = dr * dr + dg * dg + db * db
        if (d < bestD) { bestD = d; best = c }
      }
      if (assign[i] !== best) { assign[i] = best; moved = true }
    }
    const sums = centers.map(() => [0, 0, 0])
    counts.fill(0)
    for (let i = 0; i < n; i++) {
      const c = assign[i]
      counts[c]++
      sums[c][0] += points[i * 3]; sums[c][1] += points[i * 3 + 1]; sums[c][2] += points[i * 3 + 2]
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) centers[c] = [sums[c][0] / counts[c], sums[c][1] / counts[c], sums[c][2] / counts[c]]
    }
    if (!moved && iter > 0) break
  }
  return { centers, counts }
}

export interface ExtractedColor { hex: string; share: number }

/**
 * Extract a paint palette from photo pixels: ignores near-white, near-black and
 * low-saturation pixels (jar lids, labels, table) before clustering.
 */
export function extractPalette(rgba: Uint8ClampedArray | Uint8Array, k = 10, seed = 7): ExtractedColor[] {
  const candidates: number[] = []
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2]
    if (rgba[i + 3] < 200) continue
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (min > 228) continue // near-white
    if (max < 36) continue // near-black
    const { s, l } = rgbToHsl(r, g, b)
    if (s < 0.18 || l < 0.08 || l > 0.95) continue // gray clutter
    candidates.push(r, g, b)
  }
  if (candidates.length < k * 4) return []
  const { centers, counts } = kmeans(new Float32Array(candidates), k, seed)
  const total = counts.reduce((a, b) => a + b, 0) || 1
  const ranked = centers
    .map((c, i) => ({ hex: rgbToHex(c[0], c[1], c[2]), share: counts[i] / total }))
    .filter((c) => c.share > 0.015)
    .sort((a, b) => b.share - a.share)
  // merge near-duplicates (clusters of the same jar)
  const out: ExtractedColor[] = []
  for (const c of ranked) {
    const dup = out.find((o) => {
      const a = hexDist(o.hex, c.hex)
      return a < 38
    })
    if (dup) dup.share += c.share
    else out.push({ ...c })
  }
  return out
}

function hexDist(a: string, b: string): number {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const dr = ((pa >> 16) & 255) - ((pb >> 16) & 255)
  const dg = ((pa >> 8) & 255) - ((pb >> 8) & 255)
  const db = (pa & 255) - (pb & 255)
  return Math.sqrt(dr * dr + dg * dg + db * db)
}
