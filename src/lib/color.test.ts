import { describe, expect, it } from 'vitest'
import {
  deltaE, harmonies, hexToRgb, hslToRgb, nearestInPalette, rgbToHex, rgbToHsl, rgbToLab,
} from './color'

describe('hex ↔ rgb', () => {
  it('round-trips', () => {
    expect(hexToRgb('#F4B8C1')).toEqual({ r: 244, g: 184, b: 193 })
    expect(rgbToHex(244, 184, 193)).toBe('#F4B8C1')
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })
})

describe('rgb ↔ hsl', () => {
  it('round-trips primaries and pastels within 1/255', () => {
    for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#BFD8D2', '#2E6B3E', '#808080']) {
      const { r, g, b } = hexToRgb(hex)
      const { h, s, l } = rgbToHsl(r, g, b)
      const back = hslToRgb(h, s, l)
      expect(Math.abs(back.r - r)).toBeLessThanOrEqual(1)
      expect(Math.abs(back.g - g)).toBeLessThanOrEqual(1)
      expect(Math.abs(back.b - b)).toBeLessThanOrEqual(1)
    }
  })
  it('handles achromatic', () => {
    expect(rgbToHsl(128, 128, 128).s).toBe(0)
    expect(hslToRgb(123, 0, 0.5)).toEqual({ r: 128, g: 128, b: 128 })
  })
})

describe('Lab / deltaE', () => {
  it('white is L≈100, black L≈0', () => {
    expect(rgbToLab(255, 255, 255).L).toBeCloseTo(100, 0)
    expect(rgbToLab(0, 0, 0).L).toBeCloseTo(0, 0)
  })
  it('identical colors have deltaE 0; far colors are far', () => {
    const a = rgbToLab(244, 184, 193)
    expect(deltaE(a, a)).toBe(0)
    expect(deltaE(rgbToLab(255, 0, 0), rgbToLab(0, 0, 255))).toBeGreaterThan(50)
  })
})

describe('nearestInPalette', () => {
  const palette = ['#BFD8D2', '#F4B8C1', '#DCE6A0', '#2E6B3E', '#F2C744', '#C9C3E3']
  it('maps a slightly-off pink to the pink swatch', () => {
    expect(palette[nearestInPalette('#F0AEBA', palette)]).toBe('#F4B8C1')
  })
  it('maps pure green to bottle green', () => {
    expect(palette[nearestInPalette('#1E7A30', palette)]).toBe('#2E6B3E')
  })
  it('returns -1 on empty palette', () => {
    expect(nearestInPalette('#FFFFFF', [])).toBe(-1)
  })
})

describe('harmonies', () => {
  it('complementary hue is ~180° away', () => {
    const h = harmonies('#FF0000')
    const comp = hexToRgb(h.complementary[1])
    const hsl = rgbToHsl(comp.r, comp.g, comp.b)
    expect(Math.abs(hsl.h - 180)).toBeLessThan(2)
    expect(h.triadic).toHaveLength(3)
    expect(h.analogous).toHaveLength(3)
  })
})
