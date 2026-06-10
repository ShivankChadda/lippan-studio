import { applyVariant, deleteVariant, renameVariant, saveVariant } from '../../state/actions/variants'
import { activeProject, useStore } from '../../state/store'
import { BrassButton, QuietButton, SectionTitle } from '../ui/primitives'
import { IconCompare, IconTrash, IconWall } from '../ui/icons'

export function VariantsTab() {
  const variants = useStore((s) => activeProject(s).variants)
  const mode = useStore((s) => s.mode)
  const photoReady = useStore((s) => s.photo.step === 'studio')
  const busy = useStore((s) => s.busy)
  const patch = useStore((s) => s.patch)

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <SectionTitle>Variants</SectionTitle>
        <p className="text-[11px] leading-relaxed text-inksoft">
          Freeze the current look, then switch between ideas instantly. The strip under the artwork shows them too.
        </p>
        <BrassButton full disabled={!!busy || (mode === 'photo' && !photoReady)} onClick={() => void saveVariant()}>
          Save current look
        </BrassButton>
        {variants.length === 0 ? (
          <p className="rounded-xl bg-bonedeep px-3 py-3 text-[12px] text-inksoft">
            No variants yet — paint something you like and save it before experimenting further.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {variants.map((v) => (
              <li key={v.id} className="flex items-center gap-2.5 rounded-xl bg-bonedeep p-2">
                <button
                  onClick={() => void applyVariant(v.id)}
                  title={`Apply ${v.name}`}
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-full shadow-swatch transition-transform hover:scale-105"
                >
                  <img src={v.thumb} alt="" className="h-full w-full object-cover" />
                </button>
                <input
                  value={v.name}
                  onChange={(e) => renameVariant(v.id, e.target.value)}
                  aria-label="Variant name"
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[12px] font-bold focus:border-inksoft/30 focus:bg-bone"
                />
                <button
                  title="Delete variant" aria-label="Delete variant"
                  onClick={() => deleteVariant(v.id)}
                  className="rounded-full p-1.5 text-clayred hover:bg-clayred hover:text-bone"
                >
                  <IconTrash size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>See it properly</SectionTitle>
        <QuietButton full onClick={() => patch({ modal: 'compare' })} title="Side-by-side and before/after">
          <IconCompare size={15} /> Compare looks
        </QuietButton>
        <QuietButton full onClick={() => patch({ modal: 'wall' })} title="Preview on a wall at true size">
          <IconWall size={15} /> Wall preview
        </QuietButton>
      </section>
    </div>
  )
}
