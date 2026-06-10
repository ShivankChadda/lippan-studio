import { hexToRgb, hslToRgb, luminance, rgbToHsl } from './color'

/**
 * Luminance-preserving colorization: keep the photo's per-pixel lightness,
 * replace hue/saturation with the paint color, then mix with the original by
 * `strength` (0.5–1). The clay's shading and texture stay visible.
 */
export function colorizeRegion(
  base: Uint8ClampedArray | Uint8Array,
  paint: Uint8ClampedArray | Uint8Array,
  indices: Uint32Array,
  colorHex: string,
  strength: number,
): void {
  const { r, g, b } = hexToRgb(colorHex)
  const { h, s, l: paintL } = rgbToHsl(r, g, b)
  // Pre-compute a lightness LUT: photo luminance → painted lightness.
  // Center the response on the paint's own lightness so dark paints stay dark
  // while clay texture still modulates them.
  const lut = new Uint8ClampedArray(256 * 3)
  for (let v = 0; v < 256; v++) {
    const lum = v / 255
    // remap photo luminance (clay is bright, ~0.55-0.95) around the paint lightness
    const lOut = Math.max(0.04, Math.min(0.97, paintL + (lum - 0.78) * 0.55))
    const c = hslToRgb(h, s, lOut)
    lut[v * 3] = c.r; lut[v * 3 + 1] = c.g; lut[v * 3 + 2] = c.b
  }
  const k = Math.max(0, Math.min(1, strength))
  for (let n = 0; n < indices.length; n++) {
    const i = indices[n] * 4
    const lum = Math.round(luminance(base[i], base[i + 1], base[i + 2]) * 255)
    paint[i] = lut[lum * 3] * k + base[i] * (1 - k)
    paint[i + 1] = lut[lum * 3 + 1] * k + base[i + 1] * (1 - k)
    paint[i + 2] = lut[lum * 3 + 2] * k + base[i + 2] * (1 - k)
    paint[i + 3] = 255
  }
}

/** Clear a region back to transparent on the paint layer. */
export function clearRegion(paint: Uint8ClampedArray | Uint8Array, indices: Uint32Array): void {
  for (let n = 0; n < indices.length; n++) {
    const i = indices[n] * 4
    paint[i] = 0; paint[i + 1] = 0; paint[i + 2] = 0; paint[i + 3] = 0
  }
}
