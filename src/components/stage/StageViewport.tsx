import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface StageCtxValue {
  /** client → art coordinates */
  toArt: (clientX: number, clientY: number) => { x: number; y: number }
  scale: number
}

const StageCtx = createContext<StageCtxValue>({ toArt: () => ({ x: 0, y: 0 }), scale: 1 })
export const useStage = () => useContext(StageCtx)

interface Props {
  artW: number
  artH: number
  children: ReactNode
  /** overlays in screen space (counters, hints) */
  chrome?: ReactNode
  panWithPrimary?: boolean
}

/** Pinch-zoom / pan viewport. Children render at art-unit size inside a transformed plane. */
export function StageViewport({ artW, artH, children, chrome, panWithPrimary = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ kind: 'pan' | 'pinch'; start: typeof view; p0: { x: number; y: number }; dist0: number; mid0: { x: number; y: number } } | null>(null)

  const fit = () => {
    const host = hostRef.current
    if (!host || !artW || !artH) return
    const pad = 48
    const k = Math.min((host.clientWidth - pad) / artW, (host.clientHeight - pad) / artH)
    setView({ scale: k, tx: (host.clientWidth - artW * k) / 2, ty: (host.clientHeight - artH * k) / 2 })
  }

  useLayoutEffect(fit, [artW, artH])
  useEffect(() => {
    const obs = new ResizeObserver(fit)
    if (hostRef.current) obs.observe(hostRef.current)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artW, artH])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = host.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      setView((v) => {
        const k = Math.min(12, Math.max(0.05, v.scale * Math.pow(1.0015, -e.deltaY)))
        const ratio = k / v.scale
        return { scale: k, tx: px - (px - v.tx) * ratio, ty: py - (py - v.ty) * ratio }
      })
    }
    host.addEventListener('wheel', onWheel, { passive: false })
    return () => host.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    if (pts.length === 2) {
      const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y
      gesture.current = {
        kind: 'pinch', start: viewRef.current, p0: pts[0],
        dist0: Math.hypot(dx, dy) || 1,
        mid0: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      }
    } else if (e.button === 1 || (panWithPrimary && e.button === 0 && e.target === e.currentTarget)) {
      gesture.current = { kind: 'pan', start: viewRef.current, p0: { x: e.clientX, y: e.clientY }, dist0: 1, mid0: { x: 0, y: 0 } }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    if (g.kind === 'pan') {
      setView({ ...g.start, tx: g.start.tx + e.clientX - g.p0.x, ty: g.start.ty + e.clientY - g.p0.y })
    } else if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()]
      const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y
      const dist = Math.hypot(dx, dy) || 1
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      const rect = hostRef.current!.getBoundingClientRect()
      const k = Math.min(12, Math.max(0.05, g.start.scale * (dist / g.dist0)))
      const ratio = k / g.start.scale
      const px = g.mid0.x - rect.left, py = g.mid0.y - rect.top
      setView({
        scale: k,
        tx: px - (px - g.start.tx) * ratio + (mid.x - g.mid0.x),
        ty: py - (py - g.start.ty) * ratio + (mid.y - g.mid0.y),
      })
    }
  }

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2 && gesture.current?.kind === 'pinch') gesture.current = null
    if (gesture.current?.kind === 'pan') gesture.current = null
  }

  const ctx: StageCtxValue = {
    scale: view.scale,
    toArt: (cx, cy) => {
      const rect = hostRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return { x: (cx - rect.left - view.tx) / view.scale, y: (cy - rect.top - view.ty) / view.scale }
    },
  }

  return (
    <StageCtx.Provider value={ctx}>
      <div
        ref={hostRef}
        className="relative h-full w-full touch-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: artW,
            height: artH,
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
        {chrome}
      </div>
    </StageCtx.Provider>
  )
}
