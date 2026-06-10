import { describe, expect, it } from 'vitest'
import { detectBoundaries, dilate } from './edges'

describe('detectBoundaries', () => {
  it('finds a vertical step edge and ignores flat areas', () => {
    const w = 32, h = 32
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = x < 16 ? 230 : 180 // subtle low-contrast step, like clay ridge shading
        const i = (y * w + x) * 4
        rgba[i] = v; rgba[i + 1] = v; rgba[i + 2] = v; rgba[i + 3] = 255
      }
    }
    const mask = detectBoundaries(rgba, w, h, 70, 1)
    // edge column area should be set, far-away flat area should not
    let edgeHits = 0, flatHits = 0
    for (let y = 4; y < h - 4; y++) {
      for (let x = 13; x <= 18; x++) if (mask[y * w + x]) edgeHits++
      for (let x = 2; x <= 6; x++) if (mask[y * w + x]) flatHits++
    }
    expect(edgeHits).toBeGreaterThan(20)
    expect(flatHits).toBe(0)
  })
})

describe('dilate', () => {
  it('grows a single pixel into a (2r+1) square', () => {
    const w = 9, h = 9
    const mask = new Uint8Array(w * h)
    mask[4 * w + 4] = 255
    const grown = dilate(mask, w, h, 1)
    let count = 0
    for (let i = 0; i < grown.length; i++) if (grown[i]) count++
    expect(count).toBe(9)
    expect(grown[3 * w + 3]).toBe(255)
    expect(grown[2 * w + 2]).toBe(0)
  })
  it('radius 0 is a no-op', () => {
    const mask = new Uint8Array(4)
    mask[1] = 255
    expect(dilate(mask, 2, 2, 0)).toBe(mask)
  })
})
