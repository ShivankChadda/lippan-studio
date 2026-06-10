import { useEffect, useRef, useState } from 'react'
import { commitMaskStroke, eyedropAt, fillAtPoint } from '../../state/actions/photo'
import { addMirrorAt, unitsPerMm } from '../../state/actions/mirrors'
import { engine } from '../../worker/client'
import { runtime } from '../../state/runtime'
import { useStore } from '../../state/store'
import { MirrorLayer, SvgSharedDefs } from './MirrorLayer'
import { PhotoCanvases } from './PhotoCanvases'
import { BusyOverlay, MirrorCounterChip, RegionChip, VariantStrip } from './StageChrome'
import { StageViewport, useStage } from './StageViewport'
import { BoundaryPanel } from './BoundaryPanel'
import { CropView } from './CropView'
import { UploadView } from './UploadView'

export function PhotoStage() {
  const step = useStore((s) => s.photo.step)
  if (step === 'empty') return <div className="relative h-full"><UploadView /><BusyOverlay /></div>
  if (step === 'crop') return <div className="relative h-full"><CropView /><BusyOverlay /></div>
  return <PhotoStudio />
}

interface Stroke {
  pointerId: number
  pre: HTMLCanvasElement
  last: { x: number; y: number }
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

function PhotoStudio() {
  const w = useStore((s) => s.photo.width)
  const h = useStore((s) => s.photo.height)
  return (
    <div className="relative h-full">
      <StageViewport
        artW={w}
        artH={h}
        chrome={
          <>
            <BoundaryPanel />
            <MirrorCounterChip />
            <RegionChip />
            <VariantStrip />
            <BusyOverlay />
          </>
        }
      >
        <StudioPlane />
      </StageViewport>
    </div>
  )
}

function StudioPlane() {
  const { toArt, scale } = useStage()
  const tool = useStore((s) => s.tool)
  const brushSize = useStore((s) => s.brushSize)
  const w = useStore((s) => s.photo.width)
  const h = useStore((s) => s.photo.height)
  const mirrors = useStore((s) => s.photo.mirrors)
  const ridge = useStore((s) => s.photo.ridge)
  const lightSweep = useStore((s) => s.lightSweep)
  const leakHintAt = useStore((s) => s.leakHintAt)
  const patch = useStore((s) => s.patch)
  const bump = useStore((s) => s.bump)
  const upm = unitsPerMm({ ...useStore.getState(), mode: 'photo' })

  const stroke = useRef<Stroke | null>(null)
  const down = useRef<{ x: number; y: number; art: { x: number; y: number } } | null>(null)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  // boundary tools need the overlay visible to be usable
  useEffect(() => {
    if (tool === 'pen' || tool === 'eraser') patch({ showMaskOverlay: true })
  }, [tool, patch])

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = runtime.maskCanvas
    if (!c) return
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.save()
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x + 0.01, to.y + 0.01)
    ctx.stroke()
    ctx.restore()
  }

  const growBbox = (b: Stroke['bbox'], p: { x: number; y: number }) => {
    b.x0 = Math.min(b.x0, p.x); b.y0 = Math.min(b.y0, p.y)
    b.x1 = Math.max(b.x1, p.x); b.y1 = Math.max(b.y1, p.y)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const art = toArt(e.clientX, e.clientY)
    down.current = { x: e.clientX, y: e.clientY, art }
    if ((tool === 'pen' || tool === 'eraser') && runtime.maskCanvas) {
      const pre = document.createElement('canvas')
      pre.width = runtime.maskCanvas.width
      pre.height = runtime.maskCanvas.height
      pre.getContext('2d')!.drawImage(runtime.maskCanvas, 0, 0)
      stroke.current = { pointerId: e.pointerId, pre, last: art, bbox: { x0: art.x, y0: art.y, x1: art.x, y1: art.y } }
      drawSegment(art, art)
      bump('maskVersion')
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const st = stroke.current
    if (!st || st.pointerId !== e.pointerId) return
    const art = toArt(e.clientX, e.clientY)
    drawSegment(st.last, art)
    growBbox(st.bbox, art)
    st.last = art
    bump('maskVersion')
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const st = stroke.current
    if (st && st.pointerId === e.pointerId) {
      stroke.current = null
      const pad = brushSize / 2 + 2
      const x0 = Math.max(0, Math.floor(st.bbox.x0 - pad))
      const y0 = Math.max(0, Math.floor(st.bbox.y0 - pad))
      const x1 = Math.min(w - 1, Math.ceil(st.bbox.x1 + pad))
      const y1 = Math.min(h - 1, Math.ceil(st.bbox.y1 + pad))
      if (x1 > x0 && y1 > y0 && runtime.maskCanvas) {
        const before = st.pre.getContext('2d', { willReadFrequently: true })!.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
        const after = runtime.maskCanvas.getContext('2d', { willReadFrequently: true })!.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
        commitMaskStroke(before, after, x0, y0)
      }
      return
    }
    const d = down.current
    down.current = null
    if (!d) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7) return
    const { x, y } = d.art
    if (x < 0 || y < 0 || x >= w || y >= h) return
    if (tool === 'fill') {
      const id = Date.now() + Math.random()
      setRipples((r) => [...r.slice(-4), { id, x, y }])
      window.setTimeout(() => setRipples((r) => r.filter((q) => q.id !== id)), 600)
      void fillAtPoint(x, y)
    } else if (tool === 'eyedropper') {
      void eyedropAt(x, y)
    } else if (tool === 'mirror') {
      addMirrorAt(x, y)
    } else if (tool === 'select') {
      void engine.regionAt(x, y).then((id) => {
        const s = useStore.getState()
        if (id >= 0 && s.photo.fills[id]) s.patch({ selectedRegion: { mode: 'photo', id }, selectedMirrorIds: [] })
        else s.patch({ selectedRegion: null, selectedMirrorIds: [] })
      })
    }
  }

  const cursor =
    tool === 'pen' || tool === 'eraser' ? 'crosshair' :
    tool === 'eyedropper' ? 'copy' :
    tool === 'mirror' ? 'cell' : 'pointer'

  return (
    <div
      className="relative h-full w-full"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      data-testid="photo-plane"
    >
      <PhotoCanvases />
      <svg
        className={`absolute left-0 top-0 h-full w-full ${lightSweep ? 'sweep-on' : ''}`}
        viewBox={`0 0 ${w} ${h}`}
        style={{ pointerEvents: 'none' }}
      >
        <SvgSharedDefs ridge={ridge} />
        <g style={{ pointerEvents: 'auto' }}>
          <MirrorLayer mirrors={mirrors} upm={upm} artW={w} interactive />
        </g>
      </svg>
      {ripples.map((r) => (
        <div key={r.id} className="absolute" style={{ left: r.x, top: r.y, transform: `scale(${1 / scale})` }}>
          <div className="fill-ripple" />
        </div>
      ))}
      {leakHintAt && (
        <div
          className="absolute z-30"
          style={{ left: leakHintAt.x, top: leakHintAt.y, transform: `scale(${1 / scale})`, transformOrigin: '0 0' }}
        >
          <div data-testid="leak-hint" className="w-56 -translate-x-1/2 rounded-2xl border-l-4 border-clayred bg-bone px-3.5 py-2.5 text-[12px] font-semibold shadow-panel">
            That region isn’t closed — use the Boundary pen (B) to seal the gap, then try again.
          </div>
        </div>
      )}
    </div>
  )
}
