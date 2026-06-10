import { PixelEngine } from '../lib/engine'
import { handleRequest, transfersFor } from './handler'
import type { WireRequest, WireResponse } from './protocol'

const engine = new PixelEngine()

const scope = self as unknown as {
  onmessage: ((ev: MessageEvent<WireRequest>) => void) | null
  postMessage(msg: WireResponse, transfer?: Transferable[]): void
}

scope.onmessage = (ev: MessageEvent<WireRequest>) => {
  const { id, req } = ev.data
  try {
    const res = handleRequest(engine, req)
    scope.postMessage({ id, res }, transfersFor(res))
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
