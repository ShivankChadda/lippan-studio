import { clearRegionAction, toggleRegionLock } from '../../state/actions/photo'
import { clearTemplateRegion, toggleTemplateLock } from '../../state/actions/template'
import { applyVariant, deleteVariant, saveVariant } from '../../state/actions/variants'
import { activeProject, useStore } from '../../state/store'
import { countMirrors } from '../../lib/mirrors'
import { GlintSpinner } from '../ui/primitives'
import { IconClose, IconLock, IconPlus, IconTrash, IconUnlock } from '../ui/icons'

export function BusyOverlay() {
  const busy = useStore((s) => s.busy)
  if (!busy) return null
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center pb-16">
      <div className="shimmer-overlay pointer-events-none absolute inset-0" />
      <div className="rounded-2xl bg-mud/90 px-5 py-4 shadow-panel">
        <GlintSpinner size={34} label={busy} />
      </div>
    </div>
  )
}

export function MirrorCounterChip() {
  const mirrors = useStore((s) => activeProject(s).mirrors)
  const counts = countMirrors(mirrors.filter((m) => m.visible))
  if (counts.length === 0) return null
  return (
    <div
      data-testid="mirror-counter"
      className="absolute bottom-3 left-3 z-20 rounded-full bg-mud/85 px-3.5 py-1.5 font-mono text-[11px] font-medium text-bone shadow-panel"
    >
      {counts.map((c, i) => (
        <span key={`${c.shape}-${c.sizeMm}`}>
          {i > 0 && <span className="text-bone/40"> · </span>}
          {c.count} × {c.shape} {c.sizeMm}mm
        </span>
      ))}
    </div>
  )
}

export function VariantStrip() {
  const variants = useStore((s) => activeProject(s).variants)
  const busy = useStore((s) => s.busy)
  return (
    <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[70%] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-2xl bg-mud/85 p-2 shadow-panel">
      {variants.map((v) => (
        <div key={v.id} className="group relative shrink-0">
          <button
            title={`Apply ${v.name}`}
            onClick={() => void applyVariant(v.id)}
            className="block h-12 w-12 overflow-hidden rounded-full border-2 border-bone/30 transition-transform duration-200 hover:scale-105 hover:border-brasslight"
          >
            <img src={v.thumb} alt={v.name} className="h-full w-full object-cover" />
          </button>
          <button
            aria-label={`Delete ${v.name}`}
            onClick={() => deleteVariant(v.id)}
            className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-clayred text-bone group-hover:flex"
          >
            <IconClose size={9} />
          </button>
        </div>
      ))}
      <button
        title="Save current look as a variant"
        data-testid="save-variant"
        disabled={!!busy}
        onClick={() => void saveVariant()}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-bone/40 text-bone/80 transition-colors duration-200 hover:border-brasslight hover:text-brasslight disabled:opacity-40"
      >
        <IconPlus />
      </button>
    </div>
  )
}

export function RegionChip() {
  const sel = useStore((s) => s.selectedRegion)
  const photoFills = useStore((s) => s.photo.fills)
  const templateFills = useStore((s) => s.template.fills)
  const templateLocked = useStore((s) => s.template.locked)
  const patch = useStore((s) => s.patch)
  if (!sel) return null

  let color: string | undefined
  let locked = false
  if (sel.mode === 'photo') {
    const f = photoFills[sel.id]
    color = f?.colorHex
    locked = f?.locked ?? false
  } else {
    color = templateFills[sel.id]
    locked = templateLocked.includes(sel.id)
  }

  const onLock = () => (sel.mode === 'photo' ? toggleRegionLock(sel.id) : toggleTemplateLock(sel.id))
  const onClear = () => {
    if (sel.mode === 'photo') void clearRegionAction(sel.id)
    else clearTemplateRegion(sel.id)
  }

  return (
    <div className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-bone px-3 py-2 shadow-panel">
      <span
        className="h-6 w-6 rounded-full shadow-swatch"
        style={{ background: color ?? 'repeating-conic-gradient(#EAE0CC 0 25%, #F6F0E3 0 50%) 0 0/8px 8px' }}
      />
      <span className="text-[12px] font-bold">{color ? 'Painted region' : 'Unpainted region'}</span>
      <button
        title={locked ? 'Unlock region' : 'Lock region (kept by Shuffle)'}
        data-testid="region-lock"
        onClick={onLock}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${locked ? 'bg-brass text-bone' : 'text-inksoft hover:bg-bonedeep'}`}
      >
        {locked ? <IconLock size={15} /> : <IconUnlock size={15} />}
      </button>
      {color && (
        <button
          title="Clear paint from this region"
          onClick={onClear}
          className="flex h-8 w-8 items-center justify-center rounded-full text-clayred hover:bg-clayred hover:text-bone"
        >
          <IconTrash size={15} />
        </button>
      )}
      <button
        aria-label="Close"
        onClick={() => patch({ selectedRegion: null })}
        className="flex h-8 w-8 items-center justify-center rounded-full text-inksoft hover:bg-bonedeep"
      >
        <IconClose size={14} />
      </button>
    </div>
  )
}
