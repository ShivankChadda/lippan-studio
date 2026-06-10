import { useEffect, useRef, useState } from 'react'
import { applyCrop, rotateIntake, type CropSpec } from '../../state/actions/photo'
import { runtime } from '../../state/runtime'
import { initialPhoto, useStore } from '../../state/store'
import { BrassButton, QuietButton, Segmented, Slider } from '../ui/primitives'
import { IconRotate } from '../ui/icons'

type Drag = { kind: 'move' | 'radius' | 'corner'; corner?: number; sx: number; sy: number; start: CropSpec } | null

export function CropView() {
  const baseVersion = useStore((s) => s.baseVersion)
  const patchPhoto = useStore((s) => s.patchPhoto)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [disp, setDisp] = useState({ w: 10, h: 10 })
  const [crop, setCrop] = useState<CropSpec>({
    kind: 'circle', cx: 0.5, cy: 0.5, r: 0.42, x: 0.12, y: 0.12, w: 0.76, h: 0.76, brightness: 100, contrast: 100,
  })
  const drag = useRef<Drag>(null)

  useEffect(() => {
    const src = runtime.intakeCanvas
    const host = boxRef.current
    const c = canvasRef.current
    if (!src || !host || !c) return
    const fit = () => {
      const k = Math.min((host.clientWidth - 8) / src.width, (host.clientHeight - 8) / src.height)
      const w = Math.max(60, Math.round(src.width * k))
      const h = Math.max(60, Math.round(src.height * k))
      setDisp({ w, h })
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(src, 0, 0, w, h)
    }
    fit()
    const obs = new ResizeObserver(fit)
    obs.observe(host)
    return () => obs.disconnect()
  }, [baseVersion])

  const minEdge = Math.min(disp.w, disp.h)
  const norm = (px: number, py: number) => ({ nx: px / disp.w, ny: py / disp.h })

  const onPointerDown = (e: React.PointerEvent, kind: NonNullable<Drag>['kind'], corner?: number) => {
    e.stopPropagation()
    drag.current = { kind, corner, sx: e.clientX, sy: e.clientY, start: crop }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const { nx, ny } = norm(e.clientX - d.sx, e.clientY - d.sy)
    const st = d.start
    if (d.kind === 'move') {
      setCrop({ ...st, cx: clamp01(st.cx + nx), cy: clamp01(st.cy + ny), x: Math.max(0, st.x + nx), y: Math.max(0, st.y + ny) })
    } else if (d.kind === 'radius') {
      setCrop({ ...st, r: Math.min(0.75, Math.max(0.08, st.r + (e.clientX - d.sx) / minEdge)) })
    } else if (d.kind === 'corner' && d.corner !== undefined) {
      const dx = d.corner % 2 === 0 ? -nx : nx
      const dy = d.corner < 2 ? -ny : ny
      setCrop({
        ...st,
        x: d.corner % 2 === 0 ? Math.max(0, st.x - dx) : st.x,
        y: d.corner < 2 ? Math.max(0, st.y - dy) : st.y,
        w: Math.min(1, Math.max(0.08, st.w + dx)),
        h: Math.min(1, Math.max(0.08, st.h + dy)),
      })
    }
  }
  const onPointerUp = () => { drag.current = null }

  const circle = { cx: crop.cx * disp.w, cy: crop.cy * disp.h, r: crop.r * minEdge }
  const rect = { x: crop.x * disp.w, y: crop.y * disp.h, w: crop.w * disp.w, h: crop.h * disp.h }

  return (
    <div className="flex h-full flex-col items-center gap-3 p-4">
      <div ref={boxRef} className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <div className="relative shadow-piece" style={{ width: disp.w, height: disp.h }}>
          <canvas
            ref={canvasRef}
            data-testid="crop-canvas"
            className="block"
            style={{ width: disp.w, height: disp.h, filter: `brightness(${crop.brightness}%) contrast(${crop.contrast}%)` }}
          />
          {crop.kind !== 'none' && (
            <svg className="absolute inset-0" width={disp.w} height={disp.h} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
              {crop.kind === 'circle' ? (
                <>
                  <path
                    d={`M0 0H${disp.w}V${disp.h}H0Z M${circle.cx - circle.r} ${circle.cy} a${circle.r} ${circle.r} 0 1 0 ${circle.r * 2} 0 a${circle.r} ${circle.r} 0 1 0 ${-circle.r * 2} 0Z`}
                    fill="rgba(30,18,10,0.62)" fillRule="evenodd"
                  />
                  <circle cx={circle.cx} cy={circle.cy} r={circle.r} fill="transparent" stroke="var(--brasslight)" strokeWidth={2}
                    style={{ cursor: 'move' }} onPointerDown={(e) => onPointerDown(e, 'move')} />
                  <circle cx={circle.cx + circle.r} cy={circle.cy} r={9} fill="var(--brass)" stroke="var(--bone)" strokeWidth={2}
                    style={{ cursor: 'ew-resize' }} onPointerDown={(e) => onPointerDown(e, 'radius')} />
                </>
              ) : (
                <>
                  <path
                    d={`M0 0H${disp.w}V${disp.h}H0Z M${rect.x} ${rect.y}h${rect.w}v${rect.h}h${-rect.w}Z`}
                    fill="rgba(30,18,10,0.62)" fillRule="evenodd"
                  />
                  <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill="transparent" stroke="var(--brasslight)" strokeWidth={2}
                    style={{ cursor: 'move' }} onPointerDown={(e) => onPointerDown(e, 'move')} />
                  {[0, 1, 2, 3].map((i) => (
                    <rect key={i}
                      x={(i % 2 === 0 ? rect.x : rect.x + rect.w) - 7} y={(i < 2 ? rect.y : rect.y + rect.h) - 7}
                      width={14} height={14} fill="var(--brass)" stroke="var(--bone)" strokeWidth={2}
                      style={{ cursor: i === 0 || i === 3 ? 'nwse-resize' : 'nesw-resize' }}
                      onPointerDown={(e) => onPointerDown(e, 'corner', i)}
                    />
                  ))}
                </>
              )}
            </svg>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-2xl bg-bone p-3.5 shadow-panel">
        <Segmented
          small
          value={crop.kind}
          onChange={(kind) => setCrop({ ...crop, kind })}
          options={[
            { id: 'circle', label: 'Round board' },
            { id: 'rect', label: 'Rectangle' },
            { id: 'none', label: 'Full photo' },
          ]}
        />
        <div className="flex items-center gap-1">
          <button title="Rotate left" aria-label="Rotate left" onClick={() => rotateIntake(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-inksoft hover:bg-bonedeep">
            <span className="-scale-x-100"><IconRotate /></span>
          </button>
          <button title="Rotate right" aria-label="Rotate right" onClick={() => rotateIntake(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-inksoft hover:bg-bonedeep">
            <IconRotate />
          </button>
        </div>
        <div className="w-36"><Slider label="Brightness" value={crop.brightness} min={60} max={150} unit="%" onChange={(v) => setCrop({ ...crop, brightness: v })} /></div>
        <div className="w-36"><Slider label="Contrast" value={crop.contrast} min={60} max={170} unit="%" onChange={(v) => setCrop({ ...crop, contrast: v })} /></div>
        <div className="flex items-center gap-2">
          <QuietButton onClick={() => patchPhoto({ ...initialPhoto })}>Back</QuietButton>
          <BrassButton onClick={() => void applyCrop(crop)}>Use this board</BrassButton>
        </div>
      </div>
    </div>
  )
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
