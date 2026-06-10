import { unitsPerMm } from '../state/actions/mirrors'
import { runtime } from '../state/runtime'
import { useStore } from '../state/store'
import type { Mirror, RidgeStyle } from '../types'
import { shadeHex } from './color'
import { drawMirrorsToCanvas, shapeSvgPath } from './mirrors'
import { getTemplate, TEMPLATE_BOARD_RADIUS, VIEW } from './templates'

export const UNPAINTED_CLAY = '#ECE2CB'
export const RIDGE_FALLBACK = '#DDD2B8'

/** Tint the boundary mask as the ridge layer, keeping clay texture visible. */
export function renderRidgeToCanvas(
  target: CanvasRenderingContext2D,
  ridge: RidgeStyle,
  w: number,
  h: number,
): void {
  const mask = runtime.maskCanvas
  const base = runtime.baseCanvas
  if (!mask || !base || !ridge.color) return
  const tmp = document.createElement('canvas')
  tmp.width = mask.width
  tmp.height = mask.height
  const ctx = tmp.getContext('2d')!
  ctx.drawImage(mask, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  if (ridge.metallic) {
    const g = ctx.createLinearGradient(0, 0, tmp.width, tmp.height * 0.9)
    g.addColorStop(0, shadeHex(ridge.color, -0.32))
    g.addColorStop(0.45, shadeHex(ridge.color, 0.42))
    g.addColorStop(0.62, ridge.color)
    g.addColorStop(1, shadeHex(ridge.color, -0.22))
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = ridge.color
  }
  ctx.fillRect(0, 0, tmp.width, tmp.height)
  // let the photo's shading through so ridges keep their relief
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = ridge.metallic ? 0.28 : 0.38
  ctx.drawImage(base, 0, 0)
  target.drawImage(tmp, 0, 0, w, h)
}

export async function renderPhotoComposite(scale = 1): Promise<HTMLCanvasElement> {
  const s = useStore.getState()
  const base = runtime.baseCanvas
  const out = document.createElement('canvas')
  if (!base) { out.width = out.height = 10; return out }
  out.width = Math.round(base.width * scale)
  out.height = Math.round(base.height * scale)
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(base, 0, 0, out.width, out.height)
  if (runtime.paintData) {
    const tmp = document.createElement('canvas')
    tmp.width = base.width
    tmp.height = base.height
    tmp.getContext('2d')!.putImageData(runtime.paintData, 0, 0)
    ctx.drawImage(tmp, 0, 0, out.width, out.height)
  }
  renderRidgeToCanvas(ctx, s.photo.ridge, out.width, out.height)
  drawMirrorsToCanvas(ctx, s.photo.mirrors, unitsPerMm({ ...s, mode: 'photo' }), scale)
  return out
}

export function mirrorSvgMarkup(m: Mirror, upm: number): string {
  if (!m.visible) return ''
  const d = m.sizeMm * upm
  const path = shapeSvgPath(m.shape)
  const clipId = `clip-${m.id}`
  const collar = m.collar
    ? `<path d="${path}" fill="none" stroke="${m.collar}" stroke-width="0.3" stroke-linejoin="round"/>`
    : ''
  return (
    `<g transform="translate(${m.x.toFixed(2)} ${m.y.toFixed(2)}) rotate(${m.rotation.toFixed(2)}) scale(${d.toFixed(3)})">` +
    `<clipPath id="${clipId}"><path d="${path}"/></clipPath>` +
    collar +
    `<path d="${path}" fill="url(#mirrorgrad)" stroke="rgba(40,46,50,0.75)" stroke-width="0.045"/>` +
    `<g clip-path="url(#${clipId})"><ellipse cx="-0.1" cy="-0.16" rx="0.26" ry="0.055" transform="rotate(-36)" fill="rgba(255,255,255,0.8)"/></g>` +
    `</g>`
  )
}

export function svgDefs(ridge: RidgeStyle): string {
  const c = ridge.color ?? RIDGE_FALLBACK
  return (
    `<defs>` +
    `<radialGradient id="mirrorgrad" cx="0.34" cy="0.32" r="0.95">` +
    `<stop offset="0" stop-color="#FDFDFB"/><stop offset="0.45" stop-color="#D7DCDF"/>` +
    `<stop offset="0.8" stop-color="#A9B2B8"/><stop offset="1" stop-color="#7E878D"/>` +
    `</radialGradient>` +
    `<linearGradient id="ridgegrad" gradientTransform="rotate(35 0.5 0.5)">` +
    `<stop offset="0" stop-color="${shadeHex(c, -0.32)}"/><stop offset="0.45" stop-color="${shadeHex(c, 0.42)}"/>` +
    `<stop offset="0.62" stop-color="${c}"/><stop offset="1" stop-color="${shadeHex(c, -0.22)}"/>` +
    `</linearGradient>` +
    `</defs>`
  )
}

export interface TemplateRenderState {
  templateId: string
  fills: Record<string, string>
  ridge: RidgeStyle
  mirrors: Mirror[]
  boardCm: number
}

export function buildTemplateSvgString(t: TemplateRenderState): string {
  const def = getTemplate(t.templateId)
  const upm = (TEMPLATE_BOARD_RADIUS * 2) / (t.boardCm * 10)
  const stroke = t.ridge.color ? (t.ridge.metallic ? 'url(#ridgegrad)' : t.ridge.color) : RIDGE_FALLBACK
  const regions = def.regions
    .map(
      (r) =>
        `<path d="${r.d}" fill="${t.fills[r.id] ?? UNPAINTED_CLAY}" fill-rule="evenodd" ` +
        `stroke="${stroke}" stroke-width="7" stroke-linejoin="round"/>`,
    )
    .join('')
  const mirrors = t.mirrors.map((m) => mirrorSvgMarkup(m, upm)).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}">` +
    svgDefs(t.ridge) + regions + mirrors + `</svg>`
  )
}

export async function renderTemplateComposite(sizePx = 1000): Promise<HTMLCanvasElement> {
  const s = useStore.getState()
  const svg = buildTemplateSvgString({
    templateId: s.template.templateId,
    fills: s.template.fills,
    ridge: s.template.ridge,
    mirrors: s.template.mirrors,
    boardCm: s.template.boardCm,
  })
  return rasterizeSvg(svg, sizePx, sizePx)
}

export function rasterizeSvg(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(c)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('svg rasterize failed')) }
    img.src = url
  })
}

/** Current artwork as a canvas, sized so its longest edge ≈ targetPx. */
export async function renderComposite(targetPx = 1000): Promise<HTMLCanvasElement> {
  const s = useStore.getState()
  if (s.mode === 'photo') {
    const maxDim = Math.max(s.photo.width, s.photo.height) || 1000
    return renderPhotoComposite(Math.min(2, targetPx / maxDim))
  }
  return renderTemplateComposite(targetPx)
}

/** Artwork at 1× or 2× of its native working resolution (PNG export). */
export async function renderArtExport(k: 1 | 2): Promise<HTMLCanvasElement> {
  const s = useStore.getState()
  return s.mode === 'photo' ? renderPhotoComposite(k) : renderTemplateComposite(1000 * k)
}

export async function renderWallScene(wallColor: string, boardCm: number, wallPhoto: HTMLCanvasElement | null): Promise<HTMLCanvasElement> {
  const art = await renderComposite(1000)
  const W = 1600, H = 1100
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  if (wallPhoto) {
    const k = Math.max(W / wallPhoto.width, H / wallPhoto.height)
    ctx.drawImage(wallPhoto, (W - wallPhoto.width * k) / 2, (H - wallPhoto.height * k) / 2, wallPhoto.width * k, wallPhoto.height * k)
  } else {
    ctx.fillStyle = wallColor
    ctx.fillRect(0, 0, W, H)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(255,255,255,0.10)')
    g.addColorStop(1, 'rgba(0,0,0,0.14)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    // floor
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, H - 130, W, 130)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(0, H - 132, W, 2)
  }
  // the wall scene spans ~240 cm — size the board true to life
  const boardPx = (boardCm / 240) * W
  const cx = W / 2, cy = (H - 130) / 2
  ctx.save()
  ctx.translate(cx, cy + boardPx / 2 + 14)
  ctx.scale(1, 0.22)
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, boardPx * 0.62)
  sh.addColorStop(0, 'rgba(10,5,2,0.45)')
  sh.addColorStop(1, 'rgba(10,5,2,0)')
  ctx.fillStyle = sh
  ctx.fillRect(-boardPx, -boardPx, boardPx * 2, boardPx * 2)
  ctx.restore()
  ctx.drawImage(art, cx - boardPx / 2, cy - boardPx / 2, boardPx, boardPx)
  return c
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(); return }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      resolve()
    }, 'image/png')
  })
}
