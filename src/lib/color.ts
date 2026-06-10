export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }
export interface Lab { L: number; a: number; b: number }

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

export function isValidHex(s: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.trim())
}

/** h in [0,360), s and l in [0,1] */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / d + 2) * 60
  else h = ((r - g) / d + 4) * 60
  return { h, s, l }
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const hn = h / 360
  return {
    r: Math.round(hue(hn + 1 / 3) * 255),
    g: Math.round(hue(hn) * 255),
    b: Math.round(hue(hn - 1 / 3) * 255),
  }
}

/** sRGB → CIELAB (D65) */
export function rgbToLab(r: number, g: number, b: number): Lab {
  const lin = (v: number) => {
    v /= 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const rl = lin(r), gl = lin(g), bl = lin(b)
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047
  let y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175
  let z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  x = f(x); y = f(y); z = f(z)
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) }
}

/** CIE76 — Lab euclidean distance, sufficient per spec */
export function deltaE(a: Lab, b: Lab): number {
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2)
}

export function hexToLab(hex: string): Lab {
  const { r, g, b } = hexToRgb(hex)
  return rgbToLab(r, g, b)
}

/** Index of the perceptually nearest hex in `palette`, or -1 if empty. */
export function nearestInPalette(hex: string, palette: string[]): number {
  if (palette.length === 0) return -1
  const target = hexToLab(hex)
  let best = 0, bestD = Infinity
  for (let i = 0; i < palette.length; i++) {
    const d = deltaE(target, hexToLab(palette[i]))
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

export interface HarmonySchemes { complementary: string[]; analogous: string[]; triadic: string[] }

export function harmonies(baseHex: string): HarmonySchemes {
  const { r, g, b } = hexToRgb(baseHex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const at = (dh: number, dl = 0) => {
    const c = hslToRgb(h + dh, Math.min(1, Math.max(0.12, s)), Math.min(0.92, Math.max(0.12, l + dl)))
    return rgbToHex(c.r, c.g, c.b)
  }
  return {
    complementary: [baseHex.toUpperCase(), at(180), at(180, 0.18)],
    analogous: [at(-30), baseHex.toUpperCase(), at(30)],
    triadic: [baseHex.toUpperCase(), at(120), at(240)],
  }
}

/** Mix a hex toward white (amt > 0) or black (amt < 0), amt in [-1, 1]. */
export function shadeHex(hex: string, amt: number): string {
  const { r, g, b } = hexToRgb(hex)
  const t = amt > 0 ? 255 : 0
  const k = Math.abs(amt)
  return rgbToHex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k)
}

/** Perceived luminance 0..1 used by colorize. */
export function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
