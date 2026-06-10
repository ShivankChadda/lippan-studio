import { canvasImageData, downscale, fileToCanvas, isHeic, isSupportedImage, rotate90 } from '../../lib/image'
import { nearestInPalette, rgbToHex } from '../../lib/color'
import { rleEncode } from '../../lib/rle'
import { engine } from '../../worker/client'
import type { RegionFill } from '../../types'
import { histories, applyPaintPatch, maskCanvasToUint8, runtime, setPaintFromFull, uint8ToMaskCanvas } from '../runtime'
import { initialPhoto, useStore } from '../store'

const WORKING_MAX_EDGE = 1800

export async function handlePhotoFile(file: File): Promise<void> {
  const s = useStore.getState()
  if (isHeic(file)) {
    s.toast('HEIC photos can’t be read by browsers — please convert to JPG first (your phone can share as JPG).', 'error')
    return
  }
  if (!isSupportedImage(file)) {
    s.toast('Use a JPG, PNG or WebP photo.', 'error')
    return
  }
  s.patch({ busy: 'Opening photo…' })
  try {
    const full = await fileToCanvas(file)
    if (Math.max(full.width, full.height) > 2400) {
      s.toast('Large photo scaled down for smooth editing — your colors are unaffected.')
    }
    runtime.intakeCanvas = downscale(full, 2400)
    s.patchPhoto({ ...initialPhoto, step: 'crop', boardCm: s.photo.boardCm })
    s.patch({ busy: null, baseVersion: s.baseVersion + 1 })
  } catch {
    s.patch({ busy: null })
    s.toast('Couldn’t open that photo. Try a different JPG or PNG.', 'error')
  }
}

export function rotateIntake(clockwise: boolean): void {
  if (!runtime.intakeCanvas) return
  runtime.intakeCanvas = rotate90(runtime.intakeCanvas, clockwise)
  useStore.getState().bump('baseVersion')
}

export interface CropSpec {
  kind: 'circle' | 'rect' | 'none'
  /** normalized 0..1 against intake canvas */
  cx: number
  cy: number
  /** circle radius (normalized to min edge) */
  r: number
  x: number
  y: number
  w: number
  h: number
  brightness: number
  contrast: number
}

export async function applyCrop(crop: CropSpec): Promise<void> {
  const s = useStore.getState()
  const src = runtime.intakeCanvas
  if (!src) return
  s.patch({ busy: 'Preparing your board…' })
  await nextFrame()

  let rect: { x: number; y: number; w: number; h: number }
  if (crop.kind === 'circle') {
    const rPx = crop.r * Math.min(src.width, src.height)
    rect = { x: crop.cx * src.width - rPx, y: crop.cy * src.height - rPx, w: rPx * 2, h: rPx * 2 }
  } else if (crop.kind === 'rect') {
    rect = { x: crop.x * src.width, y: crop.y * src.height, w: crop.w * src.width, h: crop.h * src.height }
  } else {
    rect = { x: 0, y: 0, w: src.width, h: src.height }
  }
  rect.x = Math.max(0, Math.round(rect.x))
  rect.y = Math.max(0, Math.round(rect.y))
  rect.w = Math.min(src.width - rect.x, Math.round(rect.w))
  rect.h = Math.min(src.height - rect.y, Math.round(rect.h))
  if (rect.w < 50 || rect.h < 50) {
    s.patch({ busy: null })
    s.toast('That crop is too small — drag a larger area.', 'error')
    return
  }

  const cropped = document.createElement('canvas')
  cropped.width = rect.w
  cropped.height = rect.h
  const cctx = cropped.getContext('2d')!
  if (crop.kind === 'circle') {
    // corners take the mud-wall color so the round board sits seamlessly on the stage
    cctx.fillStyle = '#3F2D20'
    cctx.fillRect(0, 0, rect.w, rect.h)
    cctx.save()
    cctx.beginPath()
    cctx.arc(rect.w / 2, rect.h / 2, Math.min(rect.w, rect.h) / 2, 0, Math.PI * 2)
    cctx.clip()
  }
  cctx.filter = `brightness(${crop.brightness}%) contrast(${crop.contrast}%)`
  cctx.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h)
  if (crop.kind === 'circle') cctx.restore()

  const working = downscale(cropped, WORKING_MAX_EDGE)
  runtime.baseCanvas = working
  const imageData = canvasImageData(working)
  await engine.init(new Uint8ClampedArray(imageData.data), working.width, working.height)
  runtime.paintData = new ImageData(working.width, working.height)
  histories.photo.clear()
  s.patchPhoto({
    step: 'studio',
    width: working.width,
    height: working.height,
    baseDataUrl: working.toDataURL('image/jpeg', 0.88),
    fills: {},
    nextRegionId: 1,
  })
  s.patch({ busy: null, baseVersion: s.baseVersion + 1, paintVersion: s.paintVersion + 1 })
  await detectBoundariesNow()
}

export async function detectBoundariesNow(): Promise<void> {
  const s = useStore.getState()
  if (!runtime.baseCanvas) return
  s.patch({ busy: 'Finding boundaries…' })
  await nextFrame()
  try {
    const mask = await engine.detect(s.photo.edgeSensitivity, s.photo.edgeThickness)
    runtime.maskRLE = rleEncode(mask)
    uint8ToMaskCanvas(mask, runtime.baseCanvas.width, runtime.baseCanvas.height)
    s.patch({ busy: null, showMaskOverlay: true })
    s.bump('maskVersion')
  } catch {
    s.patch({ busy: null })
    s.toast('Boundary detection failed — you can still draw boundaries with the pen.', 'error')
  }
}

/** Push an undo step for a finished pen/eraser stroke and sync the worker. */
export function commitMaskStroke(before: ImageData, after: ImageData, x: number, y: number): void {
  const applyPatch = (img: ImageData) => {
    runtime.maskCanvas?.getContext('2d', { willReadFrequently: true })!.putImageData(img, x, y)
    void syncMaskToEngine()
  }
  histories.photo.push({
    label: 'Boundary edit',
    undo: () => applyPatch(before),
    redo: () => applyPatch(after),
  })
  void syncMaskToEngine()
}

export async function syncMaskToEngine(): Promise<void> {
  const mask = maskCanvasToUint8()
  if (!mask) return
  runtime.maskRLE = rleEncode(mask)
  await engine.setMask(mask)
  useStore.getState().bump('maskVersion')
}

/** The paint color currently in hand, honoring the "Only my paints" toggle. */
export function currentPaintColor(): string | null {
  const s = useStore.getState()
  if (!s.onlyMyPaints) return s.activeColor
  if (s.palette.length === 0) return null
  const exact = s.palette.find((p) => p.hex.toUpperCase() === s.activeColor.toUpperCase())
  if (exact) return exact.hex
  return s.palette[nearestInPalette(s.activeColor, s.palette.map((p) => p.hex))].hex
}

export async function fillAtPoint(x: number, y: number): Promise<void> {
  const s = useStore.getState()
  const color = currentPaintColor()
  if (!color) {
    s.toast('Add a paint color first — open the Palette tab.', 'error')
    s.patch({ panelTab: 'palette' })
    return
  }
  const existing = await engine.regionAt(x, y)
  if (existing >= 0 && s.photo.fills[existing]) {
    const prev = s.photo.fills[existing]
    if (prev.locked) {
      s.toast('That region is locked. Unlock it to repaint.')
      return
    }
    if (prev.colorHex === color && prev.strength === s.strength) return
    await recolorRegion(existing, color, s.strength, true)
    return
  }

  const regionId = s.photo.nextRegionId
  const outcome = await engine.fill({
    regionId, x: Math.floor(x), y: Math.floor(y), tolerance: s.tolerance, color, strength: s.strength,
  })
  if (outcome.status === 'boundary') return // tapped a ridge
  if (outcome.status === 'leak') {
    s.patch({ leakHintAt: { x, y } })
    window.setTimeout(() => {
      if (useStore.getState().leakHintAt?.x === x) useStore.getState().patch({ leakHintAt: null })
    }, 6000)
    return
  }
  applyPaintPatch(outcome.patch)
  const fill: RegionFill = {
    id: regionId, colorHex: color, strength: s.strength, locked: false,
    areaPx: outcome.area, seedX: Math.floor(x), seedY: Math.floor(y), tolerance: s.tolerance,
  }
  useStore.getState().patchPhoto({
    fills: { ...useStore.getState().photo.fills, [regionId]: fill },
    nextRegionId: regionId + 1,
  })
  useStore.getState().bump('paintVersion')

  histories.photo.push({
    label: 'Paint region',
    undo: () => {
      void engine.clearRegion(regionId).then((patch) => {
        if (patch) { applyPaintPatch(patch); useStore.getState().bump('paintVersion') }
        const st = useStore.getState()
        const fills = { ...st.photo.fills }
        delete fills[regionId]
        st.patchPhoto({ fills })
      })
    },
    redo: () => {
      void engine.recolor(regionId, fill.colorHex, fill.strength).then((patch) => {
        if (patch) { applyPaintPatch(patch); useStore.getState().bump('paintVersion') }
        const st = useStore.getState()
        st.patchPhoto({ fills: { ...st.photo.fills, [regionId]: fill } })
      })
    },
  })
}

export async function recolorRegion(regionId: number, color: string, strength: number, record: boolean): Promise<void> {
  const s = useStore.getState()
  const prev = s.photo.fills[regionId]
  if (!prev) return
  const doRecolor = async (hex: string, str: number) => {
    const patch = await engine.recolor(regionId, hex, str)
    if (patch) { applyPaintPatch(patch); useStore.getState().bump('paintVersion') }
    const st = useStore.getState()
    st.patchPhoto({ fills: { ...st.photo.fills, [regionId]: { ...st.photo.fills[regionId], colorHex: hex, strength: str } } })
  }
  await doRecolor(color, strength)
  if (record) {
    histories.photo.push({
      label: 'Repaint region',
      undo: () => void doRecolor(prev.colorHex, prev.strength),
      redo: () => void doRecolor(color, strength),
    })
  }
}

export async function clearRegionAction(regionId: number): Promise<void> {
  const s = useStore.getState()
  const prev = s.photo.fills[regionId]
  if (!prev) return
  const clear = async () => {
    const patch = await engine.clearRegion(regionId)
    if (patch) { applyPaintPatch(patch); useStore.getState().bump('paintVersion') }
    const st = useStore.getState()
    const fills = { ...st.photo.fills }
    delete fills[regionId]
    st.patchPhoto({ fills })
  }
  const restore = async () => {
    const patch = await engine.recolor(regionId, prev.colorHex, prev.strength)
    if (patch) { applyPaintPatch(patch); useStore.getState().bump('paintVersion') }
    const st = useStore.getState()
    st.patchPhoto({ fills: { ...st.photo.fills, [regionId]: prev } })
  }
  await clear()
  useStore.getState().patch({ selectedRegion: null })
  histories.photo.push({ label: 'Clear region', undo: () => void restore(), redo: () => void clear() })
}

export function toggleRegionLock(regionId: number): void {
  const s = useStore.getState()
  const fill = s.photo.fills[regionId]
  if (!fill) return
  s.patchPhoto({ fills: { ...s.photo.fills, [regionId]: { ...fill, locked: !fill.locked } } })
}

export async function eyedropAt(x: number, y: number): Promise<void> {
  const s = useStore.getState()
  const c = await engine.samplePaintedColor(x, y)
  if (!c) return
  let hex = rgbToHex(c.r, c.g, c.b)
  let swatchId: string | null = null
  if (s.onlyMyPaints && s.palette.length > 0) {
    const i = nearestInPalette(hex, s.palette.map((p) => p.hex))
    hex = s.palette[i].hex
    swatchId = s.palette[i].id
  } else {
    swatchId = s.palette.find((p) => p.hex.toUpperCase() === hex.toUpperCase())?.id ?? null
  }
  s.patch({ activeColor: hex, activeSwatchId: swatchId, tool: 'fill' })
}

/** Restore a full photo project (boot / import / variant apply). */
export async function restorePhotoPixels(
  baseDataUrl: string,
  maskRLE: number[] | null,
  fills: RegionFill[],
): Promise<void> {
  const { dataUrlToCanvas } = await import('../../lib/image')
  const working = await dataUrlToCanvas(baseDataUrl)
  runtime.baseCanvas = working
  const imageData = canvasImageData(working)
  await engine.init(new Uint8ClampedArray(imageData.data), working.width, working.height)
  const total = working.width * working.height
  if (maskRLE) {
    const { rleDecode } = await import('../../lib/rle')
    const mask = rleDecode(maskRLE, total)
    runtime.maskRLE = maskRLE
    uint8ToMaskCanvas(mask, working.width, working.height)
    await engine.setMask(mask)
  } else {
    runtime.maskRLE = null
    uint8ToMaskCanvas(new Uint8Array(total), working.width, working.height)
  }
  const { paint } = await engine.rebuild(
    fills.map((f) => ({ regionId: f.id, x: f.seedX, y: f.seedY, tolerance: f.tolerance, color: f.colorHex, strength: f.strength })),
  )
  setPaintFromFull(paint, working.width, working.height)
  const s = useStore.getState()
  s.patch({
    baseVersion: s.baseVersion + 1,
    maskVersion: s.maskVersion + 1,
    paintVersion: s.paintVersion + 1,
  })
}

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()))
}
