import { useRef } from 'react'
import {
  commitArrayGesture, commitMirrorGesture, duplicateMirrors, moveArrayBy, updateMirrorsLive,
} from '../../state/actions/mirrors'
import { activeProject, useStore } from '../../state/store'
import { shapeSvgPath } from '../../lib/mirrors'
import { shadeHex } from '../../lib/color'
import type { Mirror, RidgeStyle } from '../../types'
import { useStage } from './StageViewport'

export function SvgSharedDefs({ ridge }: { ridge: RidgeStyle }) {
  const c = ridge.color ?? '#DDD2B8'
  return (
    <defs>
      <radialGradient id="mirrorgrad" cx="0.34" cy="0.32" r="0.95">
        <stop offset="0" stopColor="#FDFDFB" />
        <stop offset="0.45" stopColor="#D7DCDF" />
        <stop offset="0.8" stopColor="#A9B2B8" />
        <stop offset="1" stopColor="#7E878D" />
      </radialGradient>
      <linearGradient id="ridgegrad" gradientTransform="rotate(35 0.5 0.5)">
        <stop offset="0" stopColor={shadeHex(c, -0.32)} />
        <stop offset="0.45" stopColor={shadeHex(c, 0.42)} />
        <stop offset="0.62" stopColor={c} />
        <stop offset="1" stopColor={shadeHex(c, -0.22)} />
      </linearGradient>
    </defs>
  )
}

interface DragState {
  kind: 'move' | 'rotate' | 'resize'
  ids: string[]
  before: Mirror[]
  beforeArrays: Record<string, import('../../types').RadialArrayDef>
  start: { x: number; y: number }
  last: { x: number; y: number }
  orig: Map<string, Mirror>
  /** set when the whole ring moves as a group */
  arrayId: string | null
}

export function MirrorLayer({ mirrors, upm, artW, interactive }: {
  mirrors: Mirror[]
  upm: number
  artW: number
  interactive: boolean
}) {
  const { toArt, scale } = useStage()
  const tool = useStore((s) => s.tool)
  const selected = useStore((s) => s.selectedMirrorIds)
  const patch = useStore((s) => s.patch)
  const drag = useRef<DragState | null>(null)
  const seen = useRef(new Set<string>())

  const beginDrag = (e: React.PointerEvent, kind: DragState['kind'], ids: string[], arrayId: string | null = null) => {
    const proj = activeProject(useStore.getState())
    const p = toArt(e.clientX, e.clientY)
    drag.current = {
      kind, ids, arrayId,
      before: proj.mirrors,
      beforeArrays: proj.arrays,
      start: p,
      last: p,
      orig: new Map(proj.mirrors.filter((m) => ids.includes(m.id)).map((m) => [m.id, m])),
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onMirrorDown = (m: Mirror, e: React.PointerEvent) => {
    if (!interactive || (tool !== 'select' && tool !== 'mirror')) return
    e.stopPropagation()
    let ids: string[]
    let arrayId: string | null = null
    if (e.altKey) {
      ids = duplicateMirrors([m.id])
    } else if (e.shiftKey) {
      ids = selected.includes(m.id) ? selected.filter((i) => i !== m.id) : [...selected, m.id]
    } else if (m.arrayId) {
      // a ring moves as a group until exploded
      arrayId = m.arrayId
      ids = activeProject(useStore.getState()).mirrors.filter((q) => q.arrayId === m.arrayId).map((q) => q.id)
    } else {
      ids = selected.includes(m.id) ? selected : [m.id]
    }
    patch({ selectedMirrorIds: ids, selectedRegion: null })
    if (ids.length > 0) beginDrag(e, 'move', ids, arrayId)
  }

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = toArt(e.clientX, e.clientY)
    d.last = p
    if (d.kind === 'move') {
      const dx = p.x - d.start.x, dy = p.y - d.start.y
      updateMirrorsLive(d.ids, (m) => {
        const o = d.orig.get(m.id)!
        return { ...m, x: o.x + dx, y: o.y + dy }
      })
    } else if (d.kind === 'rotate') {
      const o = d.orig.get(d.ids[0])!
      const a0 = Math.atan2(d.start.y - o.y, d.start.x - o.x)
      const a1 = Math.atan2(p.y - o.y, p.x - o.x)
      updateMirrorsLive(d.ids, (m) => ({ ...m, rotation: d.orig.get(m.id)!.rotation + ((a1 - a0) * 180) / Math.PI }))
    } else {
      const o = d.orig.get(d.ids[0])!
      const d0 = Math.hypot(d.start.x - o.x, d.start.y - o.y) || 1
      const k = Math.hypot(p.x - o.x, p.y - o.y) / d0
      updateMirrorsLive(d.ids, (m) => ({
        ...m,
        sizeMm: Math.max(2, Math.min(60, Math.round(d.orig.get(m.id)!.sizeMm * k * 10) / 10)),
      }))
    }
  }

  const onUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    if (d.kind === 'move' && d.arrayId) {
      moveArrayBy(d.arrayId, d.last.x - d.start.x, d.last.y - d.start.y)
      commitArrayGesture(d.before, d.beforeArrays)
      return
    }
    const labels = { move: 'Move mirror', rotate: 'Rotate mirror', resize: 'Resize mirror' } as const
    commitMirrorGesture(d.before, labels[d.kind])
  }

  const hs = 7 / Math.max(scale, 0.01) // screen-constant handle size

  return (
    <g>
      {mirrors.map((m) => {
        if (!m.visible) return null
        const d = m.sizeMm * upm
        const path = shapeSvgPath(m.shape)
        const isNew = !seen.current.has(m.id)
        seen.current.add(m.id)
        const isSel = interactive && selected.includes(m.id)
        return (
          <g
            key={m.id}
            transform={`translate(${m.x} ${m.y}) rotate(${m.rotation})`}
            className={isNew ? 'mirror-enter' : undefined}
            style={{ cursor: interactive ? 'move' : undefined }}
            onPointerDown={(e) => onMirrorDown(m, e)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            data-testid="mirror"
          >
            <g transform={`scale(${d})`}>
              {m.collar && (
                <path d={path} fill="none" stroke={m.collar} strokeWidth={0.3} strokeLinejoin="round" />
              )}
              <path d={path} fill="url(#mirrorgrad)" stroke="rgba(40,46,50,0.75)" strokeWidth={0.045} />
              <clipPath id={`mclip-${m.id}`}><path d={path} /></clipPath>
              <g clipPath={`url(#mclip-${m.id})`}>
                <ellipse
                  className="mirror-spec"
                  style={{ ['--sweep-delay' as string]: `${((m.x / Math.max(artW, 1)) * 2.8).toFixed(2)}s` }}
                  cx={-0.1} cy={-0.16} rx={0.26} ry={0.055}
                  transform="rotate(-36)"
                  fill="rgba(255,255,255,0.8)"
                />
              </g>
            </g>
            {isSel && (
              <g>
                <rect
                  x={-d / 2 - hs} y={-d / 2 - hs} width={d + hs * 2} height={d + hs * 2}
                  fill="none" stroke="var(--brasslight)" strokeWidth={1.6 / scale}
                  strokeDasharray={`${5 / scale} ${4 / scale}`}
                />
                {selected.length === 1 && (
                  <>
                    <line x1={0} y1={-d / 2 - hs} x2={0} y2={-d / 2 - hs * 3.2} stroke="var(--brasslight)" strokeWidth={1.4 / scale} />
                    <circle
                      cx={0} cy={-d / 2 - hs * 3.2} r={hs}
                      fill="var(--brass)" stroke="var(--bone)" strokeWidth={1.4 / scale}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => { e.stopPropagation(); beginDrag(e, 'rotate', [m.id]) }}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                    />
                    <rect
                      x={d / 2 + hs - hs} y={d / 2 + hs - hs} width={hs * 2} height={hs * 2}
                      fill="var(--brass)" stroke="var(--bone)" strokeWidth={1.4 / scale}
                      style={{ cursor: 'nwse-resize' }}
                      onPointerDown={(e) => { e.stopPropagation(); beginDrag(e, 'resize', [m.id]) }}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                    />
                  </>
                )}
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}
