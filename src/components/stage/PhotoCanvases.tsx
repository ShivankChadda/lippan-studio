import { useEffect, useRef } from 'react'
import { renderRidgeToCanvas } from '../../lib/exporter'
import { runtime } from '../../state/runtime'
import { useStore } from '../../state/store'

/** The layered photo stage: base photo, paint, ridge tint, boundary overlay. */
export function PhotoCanvases() {
  const baseVersion = useStore((s) => s.baseVersion)
  const paintVersion = useStore((s) => s.paintVersion)
  const maskVersion = useStore((s) => s.maskVersion)
  const ridge = useStore((s) => s.photo.ridge)
  const showOverlay = useStore((s) => s.showMaskOverlay)
  const w = useStore((s) => s.photo.width)
  const h = useStore((s) => s.photo.height)

  const baseRef = useRef<HTMLCanvasElement>(null)
  const paintRef = useRef<HTMLCanvasElement>(null)
  const ridgeRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = baseRef.current
    if (!c || !runtime.baseCanvas) return
    c.getContext('2d')!.drawImage(runtime.baseCanvas, 0, 0)
  }, [baseVersion, w, h])

  useEffect(() => {
    const c = paintRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, w, h)
    if (runtime.paintData) ctx.putImageData(runtime.paintData, 0, 0)
  }, [paintVersion, w, h])

  useEffect(() => {
    const c = ridgeRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, w, h)
    renderRidgeToCanvas(ctx, ridge, w, h)
  }, [maskVersion, baseVersion, ridge, w, h])

  useEffect(() => {
    const c = overlayRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, w, h)
    if (!showOverlay || !runtime.maskCanvas) return
    const tmp = document.createElement('canvas')
    tmp.width = w
    tmp.height = h
    const tctx = tmp.getContext('2d')!
    tctx.drawImage(runtime.maskCanvas, 0, 0)
    tctx.globalCompositeOperation = 'source-in'
    tctx.fillStyle = '#C2532F'
    tctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 0.85
    ctx.drawImage(tmp, 0, 0)
  }, [maskVersion, showOverlay, w, h])

  const cls = 'absolute left-0 top-0 h-full w-full'
  return (
    <>
      <canvas ref={baseRef} width={w} height={h} className={cls} data-testid="base-canvas" />
      <canvas ref={paintRef} width={w} height={h} className={cls} />
      <canvas ref={ridgeRef} width={w} height={h} className={cls} />
      <canvas ref={overlayRef} width={w} height={h} className={cls} style={{ pointerEvents: 'none' }} />
    </>
  )
}
