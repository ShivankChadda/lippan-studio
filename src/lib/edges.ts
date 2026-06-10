/**
 * Boundary detection pipeline for low-contrast clay relief photos:
 * grayscale → local contrast boost (unsharp vs box blur) → Sobel magnitude →
 * threshold (edge sensitivity) → dilation (boundary thickness).
 */

export function toGrayscale(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]
  }
  return gray
}

/** Separable box blur (running sum), radius in pixels. */
export function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius <= 0) return src.slice()
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  // horizontal
  for (let y = 0; y < h; y++) {
    const row = y * w
    let sum = 0
    for (let x = -radius; x <= radius; x++) sum += src[row + clampi(x, w)]
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / (2 * radius + 1)
      sum += src[row + clampi(x + radius + 1, w)] - src[row + clampi(x - radius, w)]
    }
  }
  // vertical
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let y = -radius; y <= radius; y++) sum += tmp[clampi(y, h) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / (2 * radius + 1)
      sum += tmp[clampi(y + radius + 1, h) * w + x] - tmp[clampi(y - radius, h) * w + x]
    }
  }
  return out
}

function clampi(v: number, max: number): number {
  return v < 0 ? 0 : v >= max ? max - 1 : v
}

/** Boost local contrast so faint ridge shadows survive thresholding. */
export function localContrastBoost(gray: Float32Array, w: number, h: number, amount = 2.5): Float32Array {
  const blurred = boxBlur(gray, w, h, Math.max(4, Math.round(Math.min(w, h) / 90)))
  const out = new Float32Array(w * h)
  for (let i = 0; i < gray.length; i++) {
    const v = 128 + (gray[i] - blurred[i]) * amount
    out[i] = v < 0 ? 0 : v > 255 ? 255 : v
  }
  return out
}

export function sobelMagnitude(gray: Float32Array, w: number, h: number): Float32Array {
  const mag = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const tl = gray[i - w - 1], t = gray[i - w], tr = gray[i - w + 1]
      const l = gray[i - 1], r = gray[i + 1]
      const bl = gray[i + w - 1], b = gray[i + w], br = gray[i + w + 1]
      const gx = tr + 2 * r + br - tl - 2 * l - bl
      const gy = bl + 2 * b + br - tl - 2 * t - tr
      mag[i] = Math.sqrt(gx * gx + gy * gy)
    }
  }
  return mag
}

/** Dilate a binary mask by `radius` using two separable max passes. */
export function dilate(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (radius <= 0) return mask
  let cur = mask
  const tmp = new Uint8Array(w * h)
  // horizontal max
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      let v = 0
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k
        if (xx >= 0 && xx < w && cur[row + xx]) { v = 255; break }
      }
      tmp[row + x] = v
    }
  }
  const out = new Uint8Array(w * h)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let v = 0
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k
        if (yy >= 0 && yy < h && tmp[yy * w + x]) { v = 255; break }
      }
      out[y * w + x] = v
    }
  }
  cur = out
  return cur
}

/**
 * @param sensitivity 0..100 — higher finds fainter edges
 * @param thickness 1..3 — dilation radius in px
 */
export function detectBoundaries(
  rgba: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
  sensitivity: number,
  thickness: number,
): Uint8Array {
  const gray = toGrayscale(rgba, w, h)
  const boosted = localContrastBoost(gray, w, h)
  const smoothed = boxBlur(boosted, w, h, 1) // tame sensor noise before Sobel
  const mag = sobelMagnitude(smoothed, w, h)
  // sensitivity 0 → very strict threshold, 100 → very permissive
  const threshold = 200 - (sensitivity / 100) * 178
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < mag.length; i++) if (mag[i] >= threshold) mask[i] = 255
  return dilate(mask, w, h, Math.max(0, Math.min(3, Math.round(thickness))))
}
