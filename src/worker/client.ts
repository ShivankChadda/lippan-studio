import { PixelEngine, type FillOutcome, type FillRequest, type RectPatch } from '../lib/engine'
import type { ExtractedColor } from '../lib/kmeans'
import { handleRequest } from './handler'
import type { EngineRequest, EngineResponse, WireResponse } from './protocol'

type Resolver = { resolve: (res: EngineResponse) => void; reject: (err: Error) => void }

/**
 * Promise-based RPC to the pixel worker. Falls back to running the engine
 * synchronously on the main thread when Workers are unavailable.
 */
class EngineClient {
  private worker: Worker | null = null
  private fallback: PixelEngine | null = null
  private pending = new Map<number, Resolver>()
  private nextId = 1

  constructor() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./pixel.worker.ts', import.meta.url), { type: 'module' })
        this.worker.onmessage = (ev: MessageEvent<WireResponse>) => {
          const data = ev.data
          const waiter = this.pending.get(data.id)
          if (!waiter) return
          this.pending.delete(data.id)
          if ('error' in data) waiter.reject(new Error(data.error))
          else waiter.resolve(data.res)
        }
      } catch {
        this.worker = null
      }
    }
    if (!this.worker) this.fallback = new PixelEngine()
  }

  private call(req: EngineRequest, transfer: Transferable[] = []): Promise<EngineResponse> {
    if (this.worker) {
      const id = this.nextId++
      return new Promise<EngineResponse>((resolve, reject) => {
        this.pending.set(id, { resolve, reject })
        this.worker!.postMessage({ id, req }, transfer)
      })
    }
    return Promise.resolve(handleRequest(this.fallback!, req))
  }

  async init(rgba: Uint8ClampedArray, width: number, height: number): Promise<void> {
    await this.call({ op: 'init', rgba, width, height }, [rgba.buffer])
  }

  async detect(sensitivity: number, thickness: number): Promise<Uint8Array> {
    const res = await this.call({ op: 'detect', sensitivity, thickness })
    return (res as Extract<EngineResponse, { op: 'detect' }>).mask
  }

  async setMask(mask: Uint8Array): Promise<void> {
    await this.call({ op: 'setMask', mask }, [mask.buffer])
  }

  async getMask(): Promise<Uint8Array> {
    const res = await this.call({ op: 'getMask' })
    return (res as Extract<EngineResponse, { op: 'getMask' }>).mask
  }

  async fill(req: FillRequest): Promise<FillOutcome> {
    const res = await this.call({ op: 'fill', req })
    return (res as Extract<EngineResponse, { op: 'fill' }>).outcome
  }

  async recolor(regionId: number, color: string, strength: number): Promise<RectPatch | null> {
    const res = await this.call({ op: 'recolor', regionId, color, strength })
    return (res as Extract<EngineResponse, { op: 'recolor' }>).patch
  }

  async clearRegion(regionId: number): Promise<RectPatch | null> {
    const res = await this.call({ op: 'clearRegion', regionId })
    return (res as Extract<EngineResponse, { op: 'clearRegion' }>).patch
  }

  async regionAt(x: number, y: number): Promise<number> {
    const res = await this.call({ op: 'regionAt', x, y })
    return (res as Extract<EngineResponse, { op: 'regionAt' }>).regionId
  }

  async samplePaintedColor(x: number, y: number): Promise<{ r: number; g: number; b: number } | null> {
    const res = await this.call({ op: 'samplePaintedColor', x, y })
    return (res as Extract<EngineResponse, { op: 'samplePaintedColor' }>).color
  }

  async rebuild(fills: FillRequest[]): Promise<{ paint: Uint8ClampedArray; results: { regionId: number; area: number }[] }> {
    const res = await this.call({ op: 'rebuild', fills })
    const r = res as Extract<EngineResponse, { op: 'rebuild' }>
    return { paint: r.paint, results: r.results }
  }

  async getPaint(): Promise<Uint8ClampedArray> {
    const res = await this.call({ op: 'getPaint' })
    return (res as Extract<EngineResponse, { op: 'getPaint' }>).paint
  }

  async extract(rgba: Uint8ClampedArray, k: number): Promise<ExtractedColor[]> {
    const res = await this.call({ op: 'extract', rgba, k }, [rgba.buffer])
    return (res as Extract<EngineResponse, { op: 'extract' }>).colors
  }
}

export const engine = new EngineClient()
