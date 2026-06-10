export interface FillResult {
  /** pixel indices (y*w+x) belonging to the region */
  indices: Uint32Array
  area: number
  /** true when the fill spilled past the leak threshold and should be discarded */
  leak: boolean
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

export const LEAK_FRACTION = 0.35

/**
 * Scanline flood fill bounded by a binary boundary mask plus a color tolerance
 * relative to the seed pixel. Returns null when the seed sits on a boundary.
 */
export function floodFill(
  rgba: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
  mask: Uint8Array,
  sx: number,
  sy: number,
  tolerance: number,
  leakFraction = LEAK_FRACTION,
): FillResult | null {
  sx = Math.floor(sx); sy = Math.floor(sy)
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null
  const seedIdx = sy * w + sx
  if (mask[seedIdx]) return null

  const sr = rgba[seedIdx * 4], sg = rgba[seedIdx * 4 + 1], sb = rgba[seedIdx * 4 + 2]
  const thr = (tolerance / 100) * 255
  const thrSq = 3 * thr * thr
  const visited = new Uint8Array(w * h)
  const ok = (i: number): boolean => {
    if (mask[i] || visited[i]) return false
    const dr = rgba[i * 4] - sr, dg = rgba[i * 4 + 1] - sg, db = rgba[i * 4 + 2] - sb
    return dr * dr + dg * dg + db * db <= thrSq
  }

  const maxArea = Math.ceil(w * h * leakFraction)
  const out: number[] = []
  let area = 0
  let leak = false
  let x0 = sx, y0 = sy, x1 = sx, y1 = sy
  // stack of spans: [x, y]
  const stack: number[] = [sx, sy]

  while (stack.length > 0 && !leak) {
    const y = stack.pop() as number
    let x = stack.pop() as number
    let i = y * w + x
    if (!ok(i)) continue
    // walk left
    while (x > 0 && ok(i - 1)) { x--; i-- }
    let spanUp = false, spanDown = false
    // walk right, filling
    while (x < w && ok(i)) {
      visited[i] = 1
      out.push(i)
      area++
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      if (area > maxArea) { leak = true; break }
      if (y > 0) {
        const up = ok(i - w)
        if (up && !spanUp) { stack.push(x, y - 1); spanUp = true }
        else if (!up) spanUp = false
      }
      if (y < h - 1) {
        const down = ok(i + w)
        if (down && !spanDown) { stack.push(x, y + 1); spanDown = true }
        else if (!down) spanDown = false
      }
      x++; i++
    }
  }

  return { indices: Uint32Array.from(out), area, leak, bbox: { x0, y0, x1, y1 } }
}
