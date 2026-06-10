import { hexToRgb, isValidHex, rgbToHex } from '../../lib/color'
import { canvasImageData, downscale, fileToCanvas, isHeic, isSupportedImage } from '../../lib/image'
import type { ExtractedColor } from '../../lib/kmeans'
import { PALETTE_PRESETS, uid } from '../../lib/presets'
import { engine } from '../../worker/client'
import type { Swatch } from '../../types'
import { useStore } from '../store'

export function addSwatch(hex: string, name?: string): Swatch | null {
  const s = useStore.getState()
  if (!isValidHex(hex)) {
    s.toast('That doesn’t look like a hex color (try #F4B8C1).', 'error')
    return null
  }
  const { r, g, b } = hexToRgb(hex)
  const swatch: Swatch = { id: uid('sw'), name: name ?? `Color ${s.palette.length + 1}`, hex: rgbToHex(r, g, b) }
  s.patch({ palette: [...s.palette, swatch], activeColor: swatch.hex, activeSwatchId: swatch.id })
  return swatch
}

export function updateSwatch(id: string, patch: Partial<Pick<Swatch, 'name' | 'hex'>>): void {
  const s = useStore.getState()
  if (patch.hex !== undefined && !isValidHex(patch.hex)) return
  s.patch({
    palette: s.palette.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    ...(patch.hex && s.activeSwatchId === id ? { activeColor: patch.hex } : {}),
  })
}

export function removeSwatch(id: string): void {
  const s = useStore.getState()
  s.patch({
    palette: s.palette.filter((p) => p.id !== id),
    activeSwatchId: s.activeSwatchId === id ? null : s.activeSwatchId,
  })
}

export function reorderSwatch(from: number, to: number): void {
  const s = useStore.getState()
  if (from === to || from < 0 || to < 0 || from >= s.palette.length || to >= s.palette.length) return
  const next = [...s.palette]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  s.patch({ palette: next })
}

export function applyPreset(presetId: string): void {
  const s = useStore.getState()
  const preset = PALETTE_PRESETS.find((p) => p.id === presetId)
  if (!preset) return
  const swatches = preset.swatches()
  s.patch({ palette: swatches, activeSwatchId: swatches[0].id, activeColor: swatches[0].hex })
  s.toast(`Loaded the ${preset.name} palette.`, 'success')
}

export function pickSwatch(id: string): void {
  const s = useStore.getState()
  const sw = s.palette.find((p) => p.id === id)
  if (!sw) return
  s.patch({ activeSwatchId: id, activeColor: sw.hex })
}

/** Decode + cluster a paint-jar photo. Returns proposals and the small canvas for the eyedropper. */
export async function analyzePaintPhoto(file: File): Promise<{ colors: ExtractedColor[]; canvas: HTMLCanvasElement } | null> {
  const s = useStore.getState()
  if (isHeic(file)) {
    s.toast('HEIC photos can’t be read by browsers — please convert to JPG first.', 'error')
    return null
  }
  if (!isSupportedImage(file)) {
    s.toast('Use a JPG, PNG or WebP photo.', 'error')
    return null
  }
  s.patch({ busy: 'Reading your paints…' })
  try {
    const canvas = downscale(await fileToCanvas(file), 720)
    const sample = downscale(canvas, 256)
    const data = canvasImageData(sample)
    const colors = await engine.extract(new Uint8ClampedArray(data.data), 10)
    s.patch({ busy: null })
    return { colors, canvas }
  } catch {
    s.patch({ busy: null })
    s.toast('Couldn’t read that photo. Try a different JPG or PNG.', 'error')
    return null
  }
}
