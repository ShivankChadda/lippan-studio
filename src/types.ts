export type Mode = 'photo' | 'template'
export type Tool = 'select' | 'fill' | 'pen' | 'eraser' | 'eyedropper' | 'mirror'
export type PanelTab = 'palette' | 'mirrors' | 'variants'

export interface Swatch {
  id: string
  name: string
  hex: string
}

export type MirrorShape = 'circle' | 'diamond' | 'square' | 'triangle' | 'almond' | 'hexagon'

export interface Mirror {
  id: string
  shape: MirrorShape
  /** center, in art units (photo px / template viewBox units) */
  x: number
  y: number
  sizeMm: number
  rotation: number
  collar: string | null
  visible: boolean
  arrayId: string | null
}

export interface RadialArrayDef {
  id: string
  cx: number
  cy: number
  n: number
  radius: number
  shape: MirrorShape
  sizeMm: number
  collar: string | null
}

export interface RegionFill {
  id: number
  colorHex: string
  strength: number
  locked: boolean
  areaPx: number
  /** seed point + tolerance let the fill be re-run on project load */
  seedX: number
  seedY: number
  tolerance: number
}

export interface RidgeStyle {
  color: string | null
  metallic: boolean
}

export interface Variant {
  id: string
  name: string
  /** small strip thumbnail (dataURL) */
  thumb: string
  /** medium composite used by the compare view (dataURL) */
  preview: string
  snapshot: ProjectSnapshot
}

/** Everything needed to restore a project state (used by variants + export). */
export interface ProjectSnapshot {
  mode: Mode
  boardCm: number
  ridge: RidgeStyle
  mirrors: Mirror[]
  arrays: RadialArrayDef[]
  /** photo mode */
  photoFills?: RegionFill[]
  maskRLE?: number[]
  /** template mode */
  templateId?: string
  templateFills?: Record<string, string>
}

export interface LippanProjectFile {
  app: 'lippan-studio'
  version: 1
  savedAt: string
  name: string
  mode: Mode
  photo: {
    baseDataUrl: string | null
    width: number
    height: number
    boardCm: number
    fills: RegionFill[]
    maskRLE: number[] | null
    ridge: RidgeStyle
    mirrors: Mirror[]
    arrays: RadialArrayDef[]
    variants: Variant[]
    edgeSensitivity: number
    edgeThickness: number
  }
  template: {
    templateId: string
    fills: Record<string, string>
    locked: string[]
    symmetry: boolean
    boardCm: number
    ridge: RidgeStyle
    mirrors: Mirror[]
    arrays: RadialArrayDef[]
    variants: Variant[]
  }
  palette: Swatch[]
  onlyMyPaints: boolean
}

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'success' | 'error'
}

export const MIRROR_SIZES_MM = [5, 8, 10, 15, 20, 25] as const

export const MIRROR_SHAPES: { id: MirrorShape; label: string }[] = [
  { id: 'circle', label: 'Round' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'square', label: 'Square' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'almond', label: 'Almond' },
  { id: 'hexagon', label: 'Hexagon' },
]
