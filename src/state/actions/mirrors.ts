import { radialPlacements } from '../../lib/mirrors'
import { uid } from '../../lib/presets'
import { TEMPLATE_BOARD_RADIUS } from '../../lib/templates'
import type { Mirror, RadialArrayDef } from '../../types'
import { histories } from '../runtime'
import { activeProject, patchActive, useStore, type StudioStore } from '../store'

/** art units per millimetre, from the board diameter setting */
export function unitsPerMm(s: StudioStore): number {
  const boardCm = activeProject(s).boardCm
  const boardUnits = s.mode === 'photo' ? Math.min(s.photo.width, s.photo.height) || 1000 : TEMPLATE_BOARD_RADIUS * 2
  return boardUnits / (boardCm * 10)
}

function history() {
  return histories[useStore.getState().mode]
}

function setMirrors(mirrors: Mirror[], arrays?: Record<string, RadialArrayDef>): void {
  patchActive(arrays ? { mirrors, arrays } : { mirrors })
}

export function addMirrorAt(x: number, y: number): void {
  const s = useStore.getState()
  const d = s.mirrorDefaults
  const mirror: Mirror = {
    id: uid('m'), shape: d.shape, x, y, sizeMm: d.sizeMm, rotation: 0,
    collar: d.collar, visible: true, arrayId: null,
  }
  const before = activeProject(s).mirrors
  const after = [...before, mirror]
  setMirrors(after)
  s.patch({ selectedMirrorIds: [mirror.id] })
  history().push({
    label: 'Add mirror',
    undo: () => { setMirrors(before); useStore.getState().patch({ selectedMirrorIds: [] }) },
    redo: () => setMirrors(after),
  })
}

/** Live updates during a drag — no undo step until commitMirrorGesture. */
export function updateMirrorsLive(ids: string[], fn: (m: Mirror) => Mirror): void {
  const s = useStore.getState()
  setMirrors(activeProject(s).mirrors.map((m) => (ids.includes(m.id) ? fn(m) : m)))
}

export function commitMirrorGesture(before: Mirror[], label = 'Move mirror'): void {
  const after = activeProject(useStore.getState()).mirrors
  if (JSON.stringify(before) === JSON.stringify(after)) return
  history().push({
    label,
    undo: () => setMirrors(before),
    redo: () => setMirrors(after),
  })
}

export function duplicateMirrors(ids: string[]): string[] {
  const s = useStore.getState()
  const before = activeProject(s).mirrors
  const clones = before.filter((m) => ids.includes(m.id)).map((m) => ({ ...m, id: uid('m'), arrayId: null }))
  const after = [...before, ...clones]
  setMirrors(after)
  history().push({ label: 'Duplicate mirror', undo: () => setMirrors(before), redo: () => setMirrors(after) })
  return clones.map((c) => c.id)
}

export function deleteMirrors(ids: string[]): void {
  const s = useStore.getState()
  const proj = activeProject(s)
  const before = proj.mirrors
  const after = before.filter((m) => !ids.includes(m.id))
  if (after.length === before.length) return
  const beforeArrays = proj.arrays
  const remainingArrayIds = new Set(after.map((m) => m.arrayId).filter(Boolean))
  const afterArrays = Object.fromEntries(Object.entries(beforeArrays).filter(([id]) => remainingArrayIds.has(id)))
  setMirrors(after, afterArrays)
  s.patch({ selectedMirrorIds: [] })
  history().push({
    label: 'Delete mirror',
    undo: () => setMirrors(before, beforeArrays),
    redo: () => setMirrors(after, afterArrays),
  })
}

export function toggleMirrorVisible(id: string): void {
  const s = useStore.getState()
  const before = activeProject(s).mirrors
  const after = before.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m))
  setMirrors(after)
  history().push({ label: 'Toggle mirror', undo: () => setMirrors(before), redo: () => setMirrors(after) })
}

function buildArrayMirrors(def: RadialArrayDef): Mirror[] {
  return radialPlacements(def).map((p) => ({
    id: uid('m'), shape: def.shape, x: p.x, y: p.y, sizeMm: def.sizeMm,
    rotation: p.rotation, collar: def.collar, visible: true, arrayId: def.id,
  }))
}

export function addRadialArray(partial: Omit<RadialArrayDef, 'id'>): void {
  const s = useStore.getState()
  const def: RadialArrayDef = { ...partial, id: uid('arr') }
  const proj = activeProject(s)
  const before = proj.mirrors
  const beforeArrays = proj.arrays
  const after = [...before, ...buildArrayMirrors(def)]
  const afterArrays = { ...beforeArrays, [def.id]: def }
  setMirrors(after, afterArrays)
  s.patch({ selectedMirrorIds: [] })
  history().push({
    label: `Add ${def.n} mirrors on a ring`,
    undo: () => setMirrors(before, beforeArrays),
    redo: () => setMirrors(after, afterArrays),
  })
}

/** Live array editing (sliders) — regenerates member mirrors. */
export function updateArrayLive(id: string, patch: Partial<RadialArrayDef>): void {
  const s = useStore.getState()
  const proj = activeProject(s)
  const def = proj.arrays[id]
  if (!def) return
  const next = { ...def, ...patch, id }
  const keep = proj.mirrors.filter((m) => m.arrayId !== id)
  setMirrors([...keep, ...buildArrayMirrors(next)], { ...proj.arrays, [id]: next })
}

export function commitArrayGesture(beforeMirrors: Mirror[], beforeArrays: Record<string, RadialArrayDef>): void {
  const proj = activeProject(useStore.getState())
  const afterMirrors = proj.mirrors
  const afterArrays = proj.arrays
  if (JSON.stringify(beforeArrays) === JSON.stringify(afterArrays)) return
  history().push({
    label: 'Edit ring',
    undo: () => setMirrors(beforeMirrors, beforeArrays),
    redo: () => setMirrors(afterMirrors, afterArrays),
  })
}

/** Shift an array's center without history (caller commits the gesture). */
export function moveArrayBy(id: string, dx: number, dy: number): void {
  const proj = activeProject(useStore.getState())
  const def = proj.arrays[id]
  if (!def) return
  patchActive({ arrays: { ...proj.arrays, [id]: { ...def, cx: def.cx + dx, cy: def.cy + dy } } })
}

export function explodeArray(id: string): void {
  const s = useStore.getState()
  const proj = activeProject(s)
  const before = proj.mirrors
  const beforeArrays = proj.arrays
  const after = before.map((m) => (m.arrayId === id ? { ...m, arrayId: null } : m))
  const afterArrays = { ...beforeArrays }
  delete afterArrays[id]
  setMirrors(after, afterArrays)
  history().push({
    label: 'Explode ring',
    undo: () => setMirrors(before, beforeArrays),
    redo: () => setMirrors(after, afterArrays),
  })
}

export function nudgeSelected(dx: number, dy: number): void {
  const s = useStore.getState()
  if (s.selectedMirrorIds.length === 0) return
  const before = activeProject(s).mirrors
  updateMirrorsLive(s.selectedMirrorIds, (m) => ({ ...m, x: m.x + dx, y: m.y + dy }))
  commitMirrorGesture(before, 'Nudge mirror')
}
