import { useStore } from '../../state/store'
import type { Tool } from '../../types'
import {
  IconDropper, IconEraser, IconFill, IconMirror, IconOverlay, IconPen, IconSelect,
} from '../ui/icons'

const TOOLS: { id: Tool; label: string; key: string; icon: React.ReactNode; photoOnly?: boolean }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: <IconSelect /> },
  { id: 'fill', label: 'Paint region', key: 'F', icon: <IconFill /> },
  { id: 'pen', label: 'Boundary pen', key: 'B', icon: <IconPen />, photoOnly: true },
  { id: 'eraser', label: 'Boundary eraser', key: 'E', icon: <IconEraser />, photoOnly: true },
  { id: 'eyedropper', label: 'Eyedropper', key: 'I', icon: <IconDropper /> },
  { id: 'mirror', label: 'Place mirror', key: 'M', icon: <IconMirror /> },
]

export function ToolRail() {
  const tool = useStore((s) => s.tool)
  const mode = useStore((s) => s.mode)
  const showMaskOverlay = useStore((s) => s.showMaskOverlay)
  const patch = useStore((s) => s.patch)

  return (
    <nav
      aria-label="Tools"
      className="flex shrink-0 flex-row items-center gap-1 border-bone/10 bg-mud px-2 py-1.5
        max-sm:border-t sm:w-14 sm:flex-col sm:border-r sm:px-0 sm:py-3"
    >
      {TOOLS.map((t) => {
        const disabled = t.photoOnly && mode !== 'photo'
        return (
          <button
            key={t.id}
            title={`${t.label} (${t.key})`}
            aria-label={t.label}
            data-testid={`tool-${t.id}`}
            disabled={disabled}
            onClick={() => patch({ tool: t.id })}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200
              ${tool === t.id ? 'bg-brass text-bone shadow-swatch' : 'text-bone/75 hover:bg-bone/10 hover:text-bone'}
              disabled:cursor-not-allowed disabled:opacity-25`}
          >
            {t.icon}
          </button>
        )
      })}
      <div className="mx-1 h-px w-7 bg-bone/15 sm:mx-0 sm:my-1" />
      <button
        title="Show boundaries overlay"
        aria-label="Show boundaries overlay"
        aria-pressed={showMaskOverlay}
        disabled={mode !== 'photo'}
        onClick={() => patch({ showMaskOverlay: !showMaskOverlay })}
        className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200
          ${showMaskOverlay && mode === 'photo' ? 'bg-bone/20 text-brasslight' : 'text-bone/75 hover:bg-bone/10'}
          disabled:cursor-not-allowed disabled:opacity-25`}
      >
        <IconOverlay />
      </button>
    </nav>
  )
}
