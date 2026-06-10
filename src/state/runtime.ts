import type { RectPatch } from '../lib/engine'
import { History } from './history'

/**
 * Non-reactive heavy state. Zustand holds serializable state + version
 * counters; canvases and pixel buffers live here to avoid copying on every
 * store update.
 */
export const runtime = {
  /** uploaded photo after EXIF orientation + rotation, before crop */
  intakeCanvas: null as HTMLCanvasElement | null,
  /** the working image: oriented, cropped, adjusted, ≤1800px */
  baseCanvas: null as HTMLCanvasElement | null,
  /** boundary mask drawing surface — white where ridge */
  maskCanvas: null as HTMLCanvasElement | null,
  /** mirror of the worker's paint layer */
  paintData: null as ImageData | null,
  /** last known RLE of the mask, kept for autosave without a worker round-trip */
  maskRLE: null as number[] | null,
}

export const histories = {
  photo: new History(64),
  template: new History(64),
}

export function applyPaintPatch(patch: RectPatch): void {
  const img = runtime.paintData
  if (!img) return
  const { x, y, w, h, pixels } = patch
  for (let row = 0; row < h; row++) {
    const dst = ((y + row) * img.width + x) * 4
    img.data.set(pixels.subarray(row * w * 4, (row + 1) * w * 4), dst)
  }
}

export function setPaintFromFull(paint: Uint8ClampedArray, w: number, h: number): void {
  runtime.paintData = new ImageData(new Uint8ClampedArray(paint), w, h)
}

export function maskCanvasToUint8(): Uint8Array | null {
  const c = runtime.maskCanvas
  if (!c) return null
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const data = ctx.getImageData(0, 0, c.width, c.height).data
  const mask = new Uint8Array(c.width * c.height)
  for (let i = 0; i < mask.length; i++) if (data[i * 4 + 3] > 96) mask[i] = 255
  return mask
}

export function uint8ToMaskCanvas(mask: Uint8Array, w: number, h: number): void {
  let c = runtime.maskCanvas
  if (!c || c.width !== w || c.height !== h) {
    c = document.createElement('canvas')
    c.width = w
    c.height = h
    runtime.maskCanvas = c
  }
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const img = ctx.createImageData(w, h)
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      img.data[i * 4] = 255; img.data[i * 4 + 1] = 255; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}
