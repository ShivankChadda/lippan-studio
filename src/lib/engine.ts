import { clearRegion, colorizeRegion } from './colorize'
import { detectBoundaries } from './edges'
import { floodFill } from './floodfill'
import { extractPalette, type ExtractedColor } from './kmeans'

export interface RectPatch {
  x: number
  y: number
  w: number
  h: number
  pixels: Uint8ClampedArray
}

export interface FillRequest {
  regionId: number
  x: number
  y: number
  tolerance: number
  color: string
  strength: number
}

export type FillOutcome =
  | { status: 'boundary' }
  | { status: 'leak' }
  | { status: 'ok'; regionId: number; area: number; patch: RectPatch }

/**
 * Owns the heavy pixel state for Photo Mode: base image, boundary mask, paint
 * layer and the per-region index cache (so re-coloring never re-fills).
 * Runs inside the Web Worker; also usable directly as a main-thread fallback.
 */
export class PixelEngine {
  private w = 0
  private h = 0
  private base: Uint8ClampedArray = new Uint8ClampedArray(0)
  private mask: Uint8Array = new Uint8Array(0)
  private paint: Uint8ClampedArray = new Uint8ClampedArray(0)
  private labels: Int32Array = new Int32Array(0)
  private regions = new Map<number, { indices: Uint32Array; bbox: { x0: number; y0: number; x1: number; y1: number } }>()

  init(rgba: Uint8ClampedArray, w: number, h: number): void {
    this.w = w
    this.h = h
    this.base = rgba
    this.mask = new Uint8Array(w * h)
    this.paint = new Uint8ClampedArray(w * h * 4)
    this.labels = new Int32Array(w * h).fill(-1)
    this.regions.clear()
  }

  get size(): { w: number; h: number } {
    return { w: this.w, h: this.h }
  }

  detect(sensitivity: number, thickness: number): Uint8Array {
    this.mask = detectBoundaries(this.base, this.w, this.h, sensitivity, thickness)
    return this.mask
  }

  setMask(mask: Uint8Array): void {
    this.mask = mask
  }

  getMask(): Uint8Array {
    return this.mask
  }

  fill(req: FillRequest): FillOutcome {
    const res = floodFill(this.base, this.w, this.h, this.mask, req.x, req.y, req.tolerance)
    if (!res) return { status: 'boundary' }
    if (res.leak) return { status: 'leak' }
    for (let i = 0; i < res.indices.length; i++) this.labels[res.indices[i]] = req.regionId
    this.regions.set(req.regionId, { indices: res.indices, bbox: res.bbox })
    colorizeRegion(this.base, this.paint, res.indices, req.color, req.strength)
    return { status: 'ok', regionId: req.regionId, area: res.area, patch: this.patchFor(res.bbox) }
  }

  recolor(regionId: number, color: string, strength: number): RectPatch | null {
    const region = this.regions.get(regionId)
    if (!region) return null
    colorizeRegion(this.base, this.paint, region.indices, color, strength)
    for (let i = 0; i < region.indices.length; i++) this.labels[region.indices[i]] = regionId
    return this.patchFor(region.bbox)
  }

  clearRegion(regionId: number): RectPatch | null {
    const region = this.regions.get(regionId)
    if (!region) return null
    clearRegion(this.paint, region.indices)
    for (let i = 0; i < region.indices.length; i++) {
      if (this.labels[region.indices[i]] === regionId) this.labels[region.indices[i]] = -1
    }
    return this.patchFor(region.bbox)
  }

  regionAt(x: number, y: number): number {
    x = Math.floor(x); y = Math.floor(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1
    return this.labels[y * this.w + x]
  }

  regionArea(regionId: number): number {
    return this.regions.get(regionId)?.indices.length ?? 0
  }

  /** Re-run every saved fill from its seed (project load / variant switch). */
  rebuild(fills: FillRequest[]): { paint: Uint8ClampedArray; results: { regionId: number; area: number }[] } {
    this.paint.fill(0)
    this.labels.fill(-1)
    this.regions.clear()
    const results: { regionId: number; area: number }[] = []
    for (const f of fills) {
      const out = this.fill(f)
      if (out.status === 'ok') results.push({ regionId: f.regionId, area: out.area })
    }
    return { paint: this.paint, results }
  }

  getPaint(): Uint8ClampedArray {
    return this.paint
  }

  samplePaintedColor(x: number, y: number): { r: number; g: number; b: number } | null {
    x = Math.floor(x); y = Math.floor(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null
    const i = (y * this.w + x) * 4
    const src = this.paint[i + 3] > 0 ? this.paint : this.base
    return { r: src[i], g: src[i + 1], b: src[i + 2] }
  }

  extract(rgba: Uint8ClampedArray, k: number): ExtractedColor[] {
    return extractPalette(rgba, k)
  }

  private patchFor(bbox: { x0: number; y0: number; x1: number; y1: number }): RectPatch {
    const x = Math.max(0, bbox.x0)
    const y = Math.max(0, bbox.y0)
    const w = Math.min(this.w - 1, bbox.x1) - x + 1
    const h = Math.min(this.h - 1, bbox.y1) - y + 1
    const pixels = new Uint8ClampedArray(w * h * 4)
    for (let row = 0; row < h; row++) {
      const src = ((y + row) * this.w + x) * 4
      pixels.set(this.paint.subarray(src, src + w * 4), row * w * 4)
    }
    return { x, y, w, h, pixels }
  }
}
