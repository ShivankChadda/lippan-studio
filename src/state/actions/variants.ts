import { renderComposite } from '../../lib/exporter'
import { uid } from '../../lib/presets'
import type { ProjectSnapshot, Variant } from '../../types'
import { histories, runtime } from '../runtime'
import { activeProject, patchActive, useStore } from '../store'
import { restorePhotoPixels } from './photo'

export function collectSnapshot(): ProjectSnapshot {
  const s = useStore.getState()
  const proj = activeProject(s)
  const snap: ProjectSnapshot = {
    mode: s.mode,
    boardCm: proj.boardCm,
    ridge: proj.ridge,
    mirrors: proj.mirrors,
    arrays: Object.values(proj.arrays),
  }
  if (s.mode === 'photo') {
    snap.photoFills = Object.values(s.photo.fills)
    snap.maskRLE = runtime.maskRLE ?? undefined
  } else {
    snap.templateId = s.template.templateId
    snap.templateFills = s.template.fills
  }
  return snap
}

export async function applySnapshot(snap: ProjectSnapshot): Promise<void> {
  const s = useStore.getState()
  const arrays = Object.fromEntries(snap.arrays.map((a) => [a.id, a]))
  if (snap.mode === 'photo') {
    const fills = Object.fromEntries((snap.photoFills ?? []).map((f) => [f.id, f]))
    s.patchPhoto({
      boardCm: snap.boardCm, ridge: snap.ridge, mirrors: snap.mirrors, arrays, fills,
    })
    if (s.photo.baseDataUrl) {
      s.patch({ busy: 'Switching variant…' })
      await restorePhotoPixels(s.photo.baseDataUrl, snap.maskRLE ?? null, snap.photoFills ?? [])
      s.patch({ busy: null })
    }
  } else {
    s.patchTemplate({
      boardCm: snap.boardCm, ridge: snap.ridge, mirrors: snap.mirrors, arrays,
      templateId: snap.templateId ?? s.template.templateId,
      fills: snap.templateFills ?? {},
    })
  }
  s.patch({ selectedMirrorIds: [], selectedRegion: null })
}

export async function saveVariant(): Promise<void> {
  const s = useStore.getState()
  const proj = activeProject(s)
  s.patch({ busy: 'Saving variant…' })
  try {
    const preview = (await renderComposite(760)).toDataURL('image/jpeg', 0.8)
    const thumb = (await renderComposite(180)).toDataURL('image/jpeg', 0.75)
    const variant: Variant = {
      id: uid('v'),
      name: `Variant ${proj.variants.length + 1}`,
      thumb, preview,
      snapshot: collectSnapshot(),
    }
    patchActive({ variants: [...proj.variants, variant] })
    s.toast(`Saved ${variant.name}.`, 'success')
  } finally {
    useStore.getState().patch({ busy: null })
  }
}

export async function applyVariant(id: string): Promise<void> {
  const s = useStore.getState()
  const variant = activeProject(s).variants.find((v) => v.id === id)
  if (!variant) return
  const before = collectSnapshot()
  await applySnapshot(variant.snapshot)
  histories[s.mode].push({
    label: `Variant: ${variant.name}`,
    undo: () => void applySnapshot(before),
    redo: () => void applySnapshot(variant.snapshot),
  })
}

export function deleteVariant(id: string): void {
  const proj = activeProject(useStore.getState())
  patchActive({ variants: proj.variants.filter((v) => v.id !== id) })
}

export function renameVariant(id: string, name: string): void {
  const proj = activeProject(useStore.getState())
  patchActive({ variants: proj.variants.map((v) => (v.id === id ? { ...v, name } : v)) })
}
