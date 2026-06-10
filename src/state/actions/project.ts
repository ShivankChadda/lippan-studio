import type { LippanProjectFile, Swatch } from '../../types'
import { histories, runtime } from '../runtime'
import { initialPhoto, initialTemplate, useStore } from '../store'
import { applyCrop, handlePhotoFile, restorePhotoPixels } from './photo'

const PROJECT_KEY = 'lippan.project.v1'
const PALETTE_KEY = 'lippan.palette.v1'
const COACH_KEY = 'lippan.coach.v1'

export function collectProjectFile(): LippanProjectFile {
  const s = useStore.getState()
  return {
    app: 'lippan-studio',
    version: 1,
    savedAt: new Date().toISOString(),
    name: s.projectName,
    mode: s.mode,
    photo: {
      baseDataUrl: s.photo.baseDataUrl,
      width: s.photo.width,
      height: s.photo.height,
      boardCm: s.photo.boardCm,
      fills: Object.values(s.photo.fills),
      maskRLE: runtime.maskRLE,
      ridge: s.photo.ridge,
      mirrors: s.photo.mirrors,
      arrays: Object.values(s.photo.arrays),
      variants: s.photo.variants,
      edgeSensitivity: s.photo.edgeSensitivity,
      edgeThickness: s.photo.edgeThickness,
    },
    template: {
      templateId: s.template.templateId,
      fills: s.template.fills,
      locked: s.template.locked,
      symmetry: s.template.symmetry,
      boardCm: s.template.boardCm,
      ridge: s.template.ridge,
      mirrors: s.template.mirrors,
      arrays: Object.values(s.template.arrays),
      variants: s.template.variants,
    },
    palette: s.palette,
    onlyMyPaints: s.onlyMyPaints,
  }
}

function isProjectFile(o: unknown): o is LippanProjectFile {
  if (typeof o !== 'object' || o === null) return false
  const f = o as Partial<LippanProjectFile>
  return f.app === 'lippan-studio' && f.version === 1 &&
    typeof f.photo === 'object' && f.photo !== null &&
    typeof f.template === 'object' && f.template !== null &&
    Array.isArray(f.palette)
}

export async function applyProjectFile(file: LippanProjectFile): Promise<void> {
  const s = useStore.getState()
  s.patch({
    projectName: file.name || 'Untitled lippan',
    mode: file.mode === 'template' ? 'template' : 'photo',
    palette: file.palette as Swatch[],
    onlyMyPaints: !!file.onlyMyPaints,
    selectedMirrorIds: [],
    selectedRegion: null,
  })
  s.patchTemplate({
    ...initialTemplate,
    templateId: file.template.templateId || 'lotus8',
    fills: file.template.fills ?? {},
    locked: file.template.locked ?? [],
    symmetry: file.template.symmetry ?? true,
    boardCm: file.template.boardCm || 30,
    ridge: file.template.ridge ?? initialTemplate.ridge,
    mirrors: file.template.mirrors ?? [],
    arrays: Object.fromEntries((file.template.arrays ?? []).map((a) => [a.id, a])),
    variants: file.template.variants ?? [],
  })
  const p = file.photo
  if (p.baseDataUrl) {
    s.patch({ busy: 'Restoring your board…' })
    try {
      await restorePhotoPixels(p.baseDataUrl, p.maskRLE ?? null, p.fills ?? [])
      useStore.getState().patchPhoto({
        step: 'studio',
        baseDataUrl: p.baseDataUrl,
        width: runtime.baseCanvas?.width ?? p.width,
        height: runtime.baseCanvas?.height ?? p.height,
        boardCm: p.boardCm || 30,
        fills: Object.fromEntries((p.fills ?? []).map((f) => [f.id, f])),
        nextRegionId: Math.max(0, ...(p.fills ?? []).map((f) => f.id)) + 1,
        ridge: p.ridge ?? initialPhoto.ridge,
        mirrors: p.mirrors ?? [],
        arrays: Object.fromEntries((p.arrays ?? []).map((a) => [a.id, a])),
        variants: p.variants ?? [],
        edgeSensitivity: p.edgeSensitivity ?? 60,
        edgeThickness: p.edgeThickness ?? 2,
      })
    } finally {
      useStore.getState().patch({ busy: null })
    }
  } else {
    useStore.getState().patchPhoto({ ...initialPhoto, boardCm: p.boardCm || 30 })
  }
  histories.photo.clear()
  histories.template.clear()
}

export function exportProjectFile(): void {
  const file = collectProjectFile()
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${file.name.replace(/[^\w\- ]+/g, '').trim() || 'project'}.lippan.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function importProjectFile(file: File): Promise<void> {
  const s = useStore.getState()
  try {
    const parsed: unknown = JSON.parse(await file.text())
    if (!isProjectFile(parsed)) {
      s.toast('That file isn’t a Lippan Studio project (.lippan.json).', 'error')
      return
    }
    await applyProjectFile(parsed)
    useStore.getState().toast('Project imported.', 'success')
  } catch {
    s.toast('Couldn’t read that file — it may be corrupted. Nothing was changed.', 'error')
  }
}

let saveTimer: number | null = null
let quotaWarned = false

function saveNow(): void {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(collectProjectFile()))
  } catch {
    if (!quotaWarned) {
      quotaWarned = true
      useStore.getState().toast('Browser storage is full — use Export project (.lippan.json) to keep your work safe.', 'error')
    }
  }
  try {
    const s = useStore.getState()
    localStorage.setItem(PALETTE_KEY, JSON.stringify({ palette: s.palette, onlyMyPaints: s.onlyMyPaints }))
  } catch { /* palette is tiny; covered by the warning above */ }
}

/** Debounced autosave (~1s) on any meaningful state change. */
export function initAutosave(): void {
  let last: unknown[] = []
  useStore.subscribe((s) => {
    const watched = [s.photo, s.template, s.palette, s.onlyMyPaints, s.projectName, s.mode, s.maskVersion]
    if (watched.every((v, i) => v === last[i])) return
    last = watched
    if (saveTimer !== null) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(saveNow, 1000)
  })
}

export async function bootFromStorage(): Promise<void> {
  const s = useStore.getState()
  try {
    const pal = localStorage.getItem(PALETTE_KEY)
    if (pal) {
      const parsed = JSON.parse(pal) as { palette?: Swatch[]; onlyMyPaints?: boolean }
      if (Array.isArray(parsed.palette)) s.patch({ palette: parsed.palette, onlyMyPaints: !!parsed.onlyMyPaints })
    }
  } catch { /* ignore corrupt palette */ }
  try {
    const raw = localStorage.getItem(PROJECT_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isProjectFile(parsed)) await applyProjectFile(parsed)
    }
  } catch { /* ignore corrupt autosave */ }
  if (!localStorage.getItem(COACH_KEY)) {
    useStore.getState().patch({ coachStep: 0 })
  }
}

export function finishCoach(): void {
  try { localStorage.setItem(COACH_KEY, 'done') } catch { /* fine */ }
  useStore.getState().patch({ coachStep: -1 })
}

/** "Try the demo" — bundled synthetic relief photo + starter palette. */
export async function loadDemo(): Promise<void> {
  const s = useStore.getState()
  s.patch({ busy: 'Loading the demo…', mode: 'photo' })
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}demo-relief.png`)
    const blob = await res.blob()
    await handlePhotoFile(new File([blob], 'demo-relief.png', { type: 'image/png' }))
    if (useStore.getState().palette.length === 0) {
      try {
        const palRes = await fetch(`${import.meta.env.BASE_URL}demo-palette.json`)
        const pal = (await palRes.json()) as Swatch[]
        if (Array.isArray(pal)) useStore.getState().patch({ palette: pal, activeColor: pal[0]?.hex ?? '#F4B8C1', activeSwatchId: pal[0]?.id ?? null })
      } catch { /* palette optional */ }
    }
    useStore.getState().patch({ projectName: 'Demo lotus board' })
    // demo image is already a clean board shot — skip the crop step
    await applyCrop({ kind: 'none', cx: 0.5, cy: 0.5, r: 0.48, x: 0, y: 0, w: 1, h: 1, brightness: 100, contrast: 100 })
  } catch {
    useStore.getState().toast('Couldn’t load the demo files.', 'error')
  } finally {
    useStore.getState().patch({ busy: null })
  }
}
