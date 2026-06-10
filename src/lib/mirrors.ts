import type { Mirror, MirrorShape, RadialArrayDef } from '../types'

/**
 * Mirror shapes are defined in a local space where the shape's bounding
 * diameter is 1 (so a 10mm mirror scales by 10 * unitsPerMm).
 */
export function shapeSvgPath(shape: MirrorShape): string {
  const r = 0.5
  switch (shape) {
    case 'circle':
      return `M ${-r} 0 a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`
    case 'square': {
      const s = r * 0.92
      return `M ${-s} ${-s} L ${s} ${-s} L ${s} ${s} L ${-s} ${s} Z`
    }
    case 'diamond':
      return `M 0 ${-r} L ${r * 0.72} 0 L 0 ${r} L ${-r * 0.72} 0 Z`
    case 'triangle': {
      const pts = [0, 1, 2].map((i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
        return `${(Math.cos(a) * r).toFixed(4)} ${(Math.sin(a) * r).toFixed(4)}`
      })
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} Z`
    }
    case 'almond':
      return `M 0 ${-r} Q ${r * 0.62} ${-r * 0.1} 0 ${r} Q ${-r * 0.62} ${-r * 0.1} 0 ${-r} Z`
    case 'hexagon': {
      const pts = [0, 1, 2, 3, 4, 5].map((i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 3
        return `${(Math.cos(a) * r).toFixed(4)} ${(Math.sin(a) * r).toFixed(4)}`
      })
      return `M ${pts.join(' L ')} Z`
    }
  }
}

export interface MirrorPlacement { x: number; y: number; rotation: number }

/** Even positions on a ring, each rotated to face the center. */
export function radialPlacements(def: Pick<RadialArrayDef, 'cx' | 'cy' | 'n' | 'radius'>): MirrorPlacement[] {
  const out: MirrorPlacement[] = []
  for (let i = 0; i < def.n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / def.n
    out.push({
      x: def.cx + Math.cos(a) * def.radius,
      y: def.cy + Math.sin(a) * def.radius,
      // shapes point "up" in local space; +90° aims that axis outward from center
      rotation: (a * 180) / Math.PI + 90,
    })
  }
  return out
}

export function countMirrors(mirrors: Mirror[]): { shape: MirrorShape; sizeMm: number; count: number }[] {
  const map = new Map<string, { shape: MirrorShape; sizeMm: number; count: number }>()
  for (const m of mirrors) {
    const key = `${m.shape}:${m.sizeMm}`
    const cur = map.get(key)
    if (cur) cur.count++
    else map.set(key, { shape: m.shape, sizeMm: m.sizeMm, count: 1 })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.sizeMm - b.sizeMm)
}

/** Canvas renderer used for exports and variant thumbnails (mirrors the SVG look). */
export function drawMirrorsToCanvas(
  ctx: CanvasRenderingContext2D,
  mirrors: Mirror[],
  unitsPerMm: number,
  scale: number,
): void {
  for (const m of mirrors) {
    if (!m.visible) continue
    const d = m.sizeMm * unitsPerMm * scale
    ctx.save()
    ctx.translate(m.x * scale, m.y * scale)
    ctx.rotate((m.rotation * Math.PI) / 180)
    const path = new Path2D(shapeSvgPath(m.shape))
    ctx.scale(d, d)
    if (m.collar) {
      ctx.lineWidth = 0.3
      ctx.strokeStyle = m.collar
      ctx.lineJoin = 'round'
      ctx.stroke(path)
    }
    const grad = ctx.createRadialGradient(-0.16, -0.18, 0.03, 0, 0, 0.62)
    grad.addColorStop(0, '#FDFDFB')
    grad.addColorStop(0.45, '#D7DCDF')
    grad.addColorStop(0.8, '#A9B2B8')
    grad.addColorStop(1, '#7E878D')
    ctx.fillStyle = grad
    ctx.fill(path)
    ctx.lineWidth = 0.045
    ctx.strokeStyle = 'rgba(40,46,50,0.75)'
    ctx.stroke(path)
    // specular streak
    ctx.save()
    ctx.clip(path)
    ctx.rotate(-Math.PI / 5)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.beginPath()
    ctx.ellipse(-0.1, -0.16, 0.26, 0.055, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.restore()
  }
}
