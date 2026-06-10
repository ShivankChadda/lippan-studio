import { describe, expect, it } from 'vitest'
import { floodFill } from './floodfill'

/** Build a w×h uniform light-gray image and an empty mask. */
function grid(w: number, h: number) {
  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = 200; rgba[i * 4 + 1] = 200; rgba[i * 4 + 2] = 200; rgba[i * 4 + 3] = 255
  }
  return { rgba, mask: new Uint8Array(w * h) }
}

function drawBox(mask: Uint8Array, w: number, x0: number, y0: number, x1: number, y1: number) {
  for (let x = x0; x <= x1; x++) { mask[y0 * w + x] = 255; mask[y1 * w + x] = 255 }
  for (let y = y0; y <= y1; y++) { mask[y * w + x0] = 255; mask[y * w + x1] = 255 }
}

describe('floodFill', () => {
  it('fills exactly the inside of a closed box', () => {
    const w = 20, h = 20
    const { rgba, mask } = grid(w, h)
    drawBox(mask, w, 5, 5, 14, 14)
    const res = floodFill(rgba, w, h, mask, 10, 10, 20)
    expect(res).not.toBeNull()
    expect(res!.leak).toBe(false)
    expect(res!.area).toBe(8 * 8) // interior of a 10x10 box with 1px walls
    expect(res!.bbox).toEqual({ x0: 6, y0: 6, x1: 13, y1: 13 })
    // no filled pixel may be a boundary pixel
    for (const i of res!.indices) expect(mask[i]).toBe(0)
  })

  it('reports a leak when the box has a gap (leak guard case)', () => {
    const w = 40, h = 40
    const { rgba, mask } = grid(w, h)
    drawBox(mask, w, 10, 10, 20, 20)
    mask[15 * w + 20] = 0 // open a 1px gap in the right wall
    const res = floodFill(rgba, w, h, mask, 15, 15, 20)
    expect(res).not.toBeNull()
    expect(res!.leak).toBe(true) // spilled into the 40x40 canvas, > 35%
  })

  it('returns null when seeded on a boundary pixel', () => {
    const w = 10, h = 10
    const { rgba, mask } = grid(w, h)
    drawBox(mask, w, 2, 2, 7, 7)
    expect(floodFill(rgba, w, h, mask, 2, 2, 20)).toBeNull()
  })

  it('respects color tolerance', () => {
    const w = 10
    const rgba = new Uint8ClampedArray(w * 4)
    for (let x = 0; x < w; x++) {
      const v = x < 5 ? 200 : 90 // sharp color step at x=5
      rgba[x * 4] = v; rgba[x * 4 + 1] = v; rgba[x * 4 + 2] = v; rgba[x * 4 + 3] = 255
    }
    const mask = new Uint8Array(w)
    const tight = floodFill(rgba, w, 1, mask, 0, 0, 10, 2)
    expect(tight!.area).toBe(5)
    const loose = floodFill(rgba, w, 1, mask, 0, 0, 60, 2)
    expect(loose!.area).toBeGreaterThan(5)
  })

  it('handles out-of-bounds seeds', () => {
    const { rgba, mask } = grid(4, 4)
    expect(floodFill(rgba, 4, 4, mask, -1, 0, 20)).toBeNull()
    expect(floodFill(rgba, 4, 4, mask, 0, 99, 20)).toBeNull()
  })
})
