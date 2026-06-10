import type { ExtractedColor } from '../lib/kmeans'
import type { FillOutcome, FillRequest, RectPatch } from '../lib/engine'

export type EngineRequest =
  | { op: 'init'; rgba: Uint8ClampedArray; width: number; height: number }
  | { op: 'detect'; sensitivity: number; thickness: number }
  | { op: 'setMask'; mask: Uint8Array }
  | { op: 'getMask' }
  | { op: 'fill'; req: FillRequest }
  | { op: 'recolor'; regionId: number; color: string; strength: number }
  | { op: 'clearRegion'; regionId: number }
  | { op: 'regionAt'; x: number; y: number }
  | { op: 'samplePaintedColor'; x: number; y: number }
  | { op: 'rebuild'; fills: FillRequest[] }
  | { op: 'getPaint' }
  | { op: 'extract'; rgba: Uint8ClampedArray; k: number }

export type EngineResponse =
  | { op: 'init' }
  | { op: 'detect'; mask: Uint8Array }
  | { op: 'setMask' }
  | { op: 'getMask'; mask: Uint8Array }
  | { op: 'fill'; outcome: FillOutcome }
  | { op: 'recolor'; patch: RectPatch | null }
  | { op: 'clearRegion'; patch: RectPatch | null }
  | { op: 'regionAt'; regionId: number }
  | { op: 'samplePaintedColor'; color: { r: number; g: number; b: number } | null }
  | { op: 'rebuild'; paint: Uint8ClampedArray; results: { regionId: number; area: number }[] }
  | { op: 'getPaint'; paint: Uint8ClampedArray }
  | { op: 'extract'; colors: ExtractedColor[] }

export interface WireRequest { id: number; req: EngineRequest }
export type WireResponse = { id: number; res: EngineResponse } | { id: number; error: string }
