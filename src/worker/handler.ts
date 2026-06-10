import type { PixelEngine } from '../lib/engine'
import type { EngineRequest, EngineResponse } from './protocol'

/** Dispatch a request against an engine (used by the worker and the no-worker fallback). */
export function handleRequest(engine: PixelEngine, req: EngineRequest): EngineResponse {
  switch (req.op) {
    case 'init':
      engine.init(req.rgba, req.width, req.height)
      return { op: 'init' }
    case 'detect':
      return { op: 'detect', mask: engine.detect(req.sensitivity, req.thickness).slice() }
    case 'setMask':
      engine.setMask(req.mask)
      return { op: 'setMask' }
    case 'getMask':
      return { op: 'getMask', mask: engine.getMask().slice() }
    case 'fill':
      return { op: 'fill', outcome: engine.fill(req.req) }
    case 'recolor':
      return { op: 'recolor', patch: engine.recolor(req.regionId, req.color, req.strength) }
    case 'clearRegion':
      return { op: 'clearRegion', patch: engine.clearRegion(req.regionId) }
    case 'regionAt':
      return { op: 'regionAt', regionId: engine.regionAt(req.x, req.y) }
    case 'samplePaintedColor':
      return { op: 'samplePaintedColor', color: engine.samplePaintedColor(req.x, req.y) }
    case 'rebuild': {
      const { paint, results } = engine.rebuild(req.fills)
      return { op: 'rebuild', paint: paint.slice(), results }
    }
    case 'getPaint':
      return { op: 'getPaint', paint: engine.getPaint().slice() }
    case 'extract':
      return { op: 'extract', colors: engine.extract(req.rgba, req.k) }
  }
}

/** Transferables for zero-copy responses out of the worker. */
export function transfersFor(res: EngineResponse): Transferable[] {
  switch (res.op) {
    case 'detect':
    case 'getMask':
      return [res.mask.buffer]
    case 'fill':
      return res.outcome.status === 'ok' ? [res.outcome.patch.pixels.buffer] : []
    case 'recolor':
    case 'clearRegion':
      return res.patch ? [res.patch.pixels.buffer] : []
    case 'rebuild':
    case 'getPaint':
      return [res.paint.buffer]
    default:
      return []
  }
}
