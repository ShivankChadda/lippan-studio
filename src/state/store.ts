import { create } from 'zustand'
import type {
  Mirror, MirrorShape, Mode, PanelTab, RadialArrayDef, RegionFill, RidgeStyle, Swatch, Toast,
  Tool, Variant,
} from '../types'

export type ModalKind =
  | 'none' | 'export' | 'compare' | 'wall' | 'shortcuts' | 'extract' | 'material' | 'templates'

export interface PhotoState {
  step: 'empty' | 'crop' | 'studio'
  baseDataUrl: string | null
  width: number
  height: number
  boardCm: number
  edgeSensitivity: number
  edgeThickness: number
  fills: Record<number, RegionFill>
  nextRegionId: number
  ridge: RidgeStyle
  mirrors: Mirror[]
  arrays: Record<string, RadialArrayDef>
  variants: Variant[]
}

export interface TemplateState {
  templateId: string
  fills: Record<string, string>
  locked: string[]
  symmetry: boolean
  boardCm: number
  ridge: RidgeStyle
  mirrors: Mirror[]
  arrays: Record<string, RadialArrayDef>
  variants: Variant[]
}

export interface StudioStore {
  mode: Mode
  tool: Tool
  panelTab: PanelTab
  brushSize: number
  tolerance: number
  /** colorize strength 0.5..1 */
  strength: number
  activeColor: string
  activeSwatchId: string | null
  showMaskOverlay: boolean
  lightSweep: boolean
  projectName: string

  palette: Swatch[]
  onlyMyPaints: boolean

  photo: PhotoState
  template: TemplateState

  mirrorDefaults: { shape: MirrorShape; sizeMm: number; collar: string | null }
  selectedMirrorIds: string[]
  selectedRegion: { mode: 'photo'; id: number } | { mode: 'template'; id: string } | null

  toasts: Toast[]
  modal: ModalKind
  coachStep: number
  busy: string | null
  leakHintAt: { x: number; y: number } | null

  baseVersion: number
  maskVersion: number
  paintVersion: number
  historyVersion: number

  patch: (p: Partial<StudioStore>) => void
  patchPhoto: (p: Partial<PhotoState>) => void
  patchTemplate: (p: Partial<TemplateState>) => void
  toast: (text: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
  bump: (key: 'baseVersion' | 'maskVersion' | 'paintVersion' | 'historyVersion') => void
}

export const initialPhoto: PhotoState = {
  step: 'empty',
  baseDataUrl: null,
  width: 0,
  height: 0,
  boardCm: 30,
  edgeSensitivity: 60,
  edgeThickness: 2,
  fills: {},
  nextRegionId: 1,
  ridge: { color: null, metallic: false },
  mirrors: [],
  arrays: {},
  variants: [],
}

export const initialTemplate: TemplateState = {
  templateId: 'lotus8',
  fills: {},
  locked: [],
  symmetry: true,
  boardCm: 30,
  ridge: { color: '#F4EFE4', metallic: false },
  mirrors: [],
  arrays: {},
  variants: [],
}

let toastId = 1

export const useStore = create<StudioStore>()((set) => ({
  mode: 'photo',
  tool: 'fill',
  panelTab: 'palette',
  brushSize: 14,
  tolerance: 28,
  strength: 0.85,
  activeColor: '#F4B8C1',
  activeSwatchId: null,
  showMaskOverlay: false,
  lightSweep: false,
  projectName: 'Untitled lippan',

  palette: [],
  onlyMyPaints: false,

  photo: initialPhoto,
  template: initialTemplate,

  mirrorDefaults: { shape: 'circle', sizeMm: 10, collar: null },
  selectedMirrorIds: [],
  selectedRegion: null,

  toasts: [],
  modal: 'none',
  coachStep: -1,
  busy: null,
  leakHintAt: null,

  baseVersion: 0,
  maskVersion: 0,
  paintVersion: 0,
  historyVersion: 0,

  patch: (p) => set(p),
  patchPhoto: (p) => set((s) => ({ photo: { ...s.photo, ...p } })),
  patchTemplate: (p) => set((s) => ({ template: { ...s.template, ...p } })),
  toast: (text, kind = 'info') =>
    set((s) => {
      const id = toastId++
      setTimeout(() => useStore.getState().dismissToast(id), 5000)
      return { toasts: [...s.toasts.slice(-2), { id, text, kind }] }
    }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  bump: (key) => set((s) => ({ [key]: s[key] + 1 }) as Partial<StudioStore>),
}))

/** The project slice for the currently active mode. */
export function activeProject(s: StudioStore): {
  boardCm: number
  ridge: RidgeStyle
  mirrors: Mirror[]
  arrays: Record<string, RadialArrayDef>
  variants: Variant[]
} {
  return s.mode === 'photo' ? s.photo : s.template
}

export function patchActive(p: {
  boardCm?: number
  ridge?: RidgeStyle
  mirrors?: Mirror[]
  arrays?: Record<string, RadialArrayDef>
  variants?: Variant[]
}): void {
  const s = useStore.getState()
  if (s.mode === 'photo') s.patchPhoto(p)
  else s.patchTemplate(p)
}
