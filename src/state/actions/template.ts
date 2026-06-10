import { getTemplate } from '../../lib/templates'
import type { RidgeStyle } from '../../types'
import { histories } from '../runtime'
import { activeProject, patchActive, useStore } from '../store'
import { currentPaintColor, recolorRegion } from './photo'
import { engine } from '../../worker/client'
import { applyPaintPatch } from '../runtime'

export function paintTemplateRegion(regionId: string): void {
  const s = useStore.getState()
  const color = currentPaintColor()
  if (!color) {
    s.toast('Add a paint color first — open the Palette tab.', 'error')
    s.patch({ panelTab: 'palette' })
    return
  }
  if (s.template.locked.includes(regionId)) {
    s.toast('That region is locked. Unlock it to repaint.')
    return
  }
  const def = getTemplate(s.template.templateId)
  const region = def.regions.find((r) => r.id === regionId)
  if (!region) return
  const targets = s.template.symmetry
    ? def.regions.filter((r) => r.group === region.group && !s.template.locked.includes(r.id)).map((r) => r.id)
    : [regionId]
  const before = s.template.fills
  const after = { ...before }
  for (const id of targets) after[id] = color
  if (JSON.stringify(before) === JSON.stringify(after)) return
  s.patchTemplate({ fills: after })
  histories.template.push({
    label: 'Paint region',
    undo: () => useStore.getState().patchTemplate({ fills: before }),
    redo: () => useStore.getState().patchTemplate({ fills: after }),
  })
}

export function clearTemplateRegion(regionId: string): void {
  const s = useStore.getState()
  if (!(regionId in s.template.fills)) return
  const before = s.template.fills
  const after = { ...before }
  delete after[regionId]
  s.patchTemplate({ fills: after })
  s.patch({ selectedRegion: null })
  histories.template.push({
    label: 'Clear region',
    undo: () => useStore.getState().patchTemplate({ fills: before }),
    redo: () => useStore.getState().patchTemplate({ fills: after }),
  })
}

export function toggleTemplateLock(regionId: string): void {
  const s = useStore.getState()
  const locked = s.template.locked.includes(regionId)
    ? s.template.locked.filter((id) => id !== regionId)
    : [...s.template.locked, regionId]
  s.patchTemplate({ locked })
}

export function switchTemplate(templateId: string): void {
  const s = useStore.getState()
  s.patchTemplate({ templateId, fills: {}, locked: [] })
  s.patch({ selectedRegion: null, selectedMirrorIds: [] })
  histories.template.clear()
}

/** Ridge finish applies globally to the active mode, with undo. */
export function setRidgeStyle(ridge: RidgeStyle): void {
  const s = useStore.getState()
  const before = activeProject(s).ridge
  patchActive({ ridge })
  histories[s.mode].push({
    label: 'Ridge finish',
    undo: () => patchActive({ ridge: before }),
    redo: () => patchActive({ ridge }),
  })
}

/** Randomize all unlocked regions from the working palette — one undo step. */
export async function shuffleColors(): Promise<void> {
  const s = useStore.getState()
  if (s.palette.length === 0) {
    s.toast('Shuffle needs a palette — add your paints first.', 'error')
    return
  }
  const pick = () => s.palette[Math.floor(Math.random() * s.palette.length)].hex
  if (s.mode === 'template') {
    const def = getTemplate(s.template.templateId)
    const before = s.template.fills
    const after: Record<string, string> = { ...before }
    const groupColor = new Map<string, string>()
    for (const r of def.regions) {
      if (s.template.locked.includes(r.id)) continue
      const key = s.template.symmetry ? r.group : r.id
      if (!groupColor.has(key)) groupColor.set(key, pick())
      after[r.id] = groupColor.get(key)!
    }
    s.patchTemplate({ fills: after })
    histories.template.push({
      label: 'Shuffle colors',
      undo: () => useStore.getState().patchTemplate({ fills: before }),
      redo: () => useStore.getState().patchTemplate({ fills: after }),
    })
    return
  }
  // photo mode
  const fills = Object.values(s.photo.fills).filter((f) => !f.locked)
  if (fills.length === 0) {
    s.toast('Paint a few regions first, then shuffle.')
    return
  }
  const changes = fills.map((f) => ({ id: f.id, prev: f.colorHex, prevStrength: f.strength, next: pick() }))
  const apply = async (dir: 'next' | 'prev') => {
    for (const c of changes) {
      const patch = await engine.recolor(c.id, dir === 'next' ? c.next : c.prev, c.prevStrength)
      if (patch) applyPaintPatch(patch)
    }
    const st = useStore.getState()
    const map = { ...st.photo.fills }
    for (const c of changes) {
      if (map[c.id]) map[c.id] = { ...map[c.id], colorHex: dir === 'next' ? c.next : c.prev }
    }
    st.patchPhoto({ fills: map })
    st.bump('paintVersion')
  }
  await apply('next')
  histories.photo.push({
    label: 'Shuffle colors',
    undo: () => void apply('prev'),
    redo: () => void apply('next'),
  })
}

/** Strength slider applied to the selected painted region. */
export async function applyStrengthToSelection(strength: number): Promise<void> {
  const s = useStore.getState()
  if (s.mode !== 'photo' || s.selectedRegion?.mode !== 'photo') return
  const fill = s.photo.fills[s.selectedRegion.id]
  if (!fill) return
  await recolorRegion(fill.id, fill.colorHex, strength, true)
}
