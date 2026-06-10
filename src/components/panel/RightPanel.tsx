import { useStore } from '../../state/store'
import type { PanelTab } from '../../types'
import { MirrorsTab } from './MirrorsTab'
import { PaletteTab } from './PaletteTab'
import { VariantsTab } from './VariantsTab'

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'palette', label: 'Palette' },
  { id: 'mirrors', label: 'Mirrors' },
  { id: 'variants', label: 'Variants' },
]

export function RightPanel() {
  const tab = useStore((s) => s.panelTab)
  const patch = useStore((s) => s.patch)
  return (
    <aside
      className="flex min-h-0 w-full flex-col border-bone/10 bg-bone shadow-panel
        max-sm:h-[36dvh] max-sm:shrink-0 max-sm:border-t sm:w-[320px] sm:shrink-0 sm:border-l"
      aria-label="Properties"
    >
      <div className="flex shrink-0 gap-1 border-b border-bonedeep px-3 pt-2.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => patch({ panelTab: t.id })}
            className={`relative min-h-[40px] rounded-t-xl px-3.5 pb-2 pt-1.5 text-[12px] font-bold transition-colors
              ${tab === t.id ? 'text-brass' : 'text-inksoft hover:text-ink'}`}
          >
            {t.label}
            {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brass" />}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'palette' && <PaletteTab />}
        {tab === 'mirrors' && <MirrorsTab />}
        {tab === 'variants' && <VariantsTab />}
      </div>
    </aside>
  )
}
