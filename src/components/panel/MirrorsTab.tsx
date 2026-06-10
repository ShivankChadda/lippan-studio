import { useState } from 'react'
import { shapeSvgPath } from '../../lib/mirrors'
import { TEMPLATE_BOARD_RADIUS, VIEW } from '../../lib/templates'
import {
  addRadialArray, commitArrayGesture, deleteMirrors, explodeArray, toggleMirrorVisible, updateArrayLive,
} from '../../state/actions/mirrors'
import { activeProject, patchActive, useStore } from '../../state/store'
import { MIRROR_SHAPES, MIRROR_SIZES_MM, type Mirror, type RadialArrayDef } from '../../types'
import { BrassButton, QuietButton, SectionTitle, Slider } from '../ui/primitives'
import { IconEye, IconEyeOff, IconRing, IconTrash } from '../ui/icons'

function ShapeButton({ shape, active, onClick, label }: { shape: string; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      title={label}
      aria-label={label}
      data-testid={`shape-${shape}`}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200
        ${active ? 'bg-brass text-bone shadow-swatch' : 'bg-bonedeep text-inksoft hover:text-ink'}`}
    >
      <svg viewBox="-0.62 -0.62 1.24 1.24" width={22} height={22}>
        <path d={shapeSvgPath(shape as Mirror['shape'])} fill="currentColor" />
      </svg>
    </button>
  )
}

export function MirrorsTab() {
  const s = useStore()
  const proj = activeProject(s)
  const defaults = s.mirrorDefaults
  const [ringN, setRingN] = useState(12)
  const [ringRadiusPct, setRingRadiusPct] = useState(62)
  const arrays = Object.values(proj.arrays)
  const boardUnits = s.mode === 'photo' ? Math.min(s.photo.width, s.photo.height) || 1000 : TEMPLATE_BOARD_RADIUS * 2

  const center = s.mode === 'photo'
    ? { x: s.photo.width / 2, y: s.photo.height / 2 }
    : { x: VIEW / 2, y: VIEW / 2 }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionTitle>Board</SectionTitle>
        <label className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[12px] font-semibold">Board diameter</span>
          <span className="flex items-center gap-1.5">
            <input
              type="number" min={10} max={120} value={proj.boardCm}
              data-testid="board-cm"
              onChange={(e) => patchActive({ boardCm: Math.max(10, Math.min(120, Number(e.target.value) || 30)) })}
              className="w-16 rounded-lg border border-inksoft/20 bg-bone px-2 py-1.5 text-right font-mono text-[12px]"
            />
            <span className="font-mono text-[11px] text-inksoft">cm</span>
          </span>
        </label>
        <p className="mt-1 text-[11px] text-inksoft">Mirror millimetres render true to this size.</p>
      </section>

      <section>
        <SectionTitle>Mirror in hand</SectionTitle>
        <p className="mb-2 mt-0.5 text-[11px] text-inksoft">Tap the artwork with the Mirror tool (M) to place.</p>
        <div className="flex flex-wrap gap-1.5">
          {MIRROR_SHAPES.map((sh) => (
            <ShapeButton key={sh.id} shape={sh.id} label={sh.label}
              active={defaults.shape === sh.id}
              onClick={() => s.patch({ mirrorDefaults: { ...defaults, shape: sh.id }, tool: 'mirror' })}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {MIRROR_SIZES_MM.map((mm) => (
            <button
              key={mm}
              data-testid={`size-${mm}`}
              onClick={() => s.patch({ mirrorDefaults: { ...defaults, sizeMm: mm } })}
              className={`min-h-[36px] rounded-full px-3 py-1.5 font-mono text-[11px] font-medium transition-colors
                ${defaults.sizeMm === mm ? 'bg-brass text-bone' : 'bg-bonedeep text-inksoft hover:text-ink'}`}
            >
              {mm}mm
            </button>
          ))}
          <input
            type="number" min={2} max={60} value={defaults.sizeMm}
            aria-label="Custom size in mm"
            onChange={(e) => s.patch({ mirrorDefaults: { ...defaults, sizeMm: Math.max(2, Math.min(60, Number(e.target.value) || 10)) } })}
            className="w-16 rounded-lg border border-inksoft/20 bg-bone px-2 py-1.5 text-right font-mono text-[12px]"
          />
        </div>
        <label className="mt-3 flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl bg-bonedeep px-3 py-2">
          <span className="text-[12px] font-bold">Clay collar ring</span>
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={defaults.collar !== null}
              onChange={(e) => s.patch({ mirrorDefaults: { ...defaults, collar: e.target.checked ? (s.activeColor || '#F4EFE4') : null } })}
              className="h-5 w-5 accent-[var(--brass)]"
              aria-label="Toggle clay collar"
            />
            {defaults.collar && !s.onlyMyPaints && (
              <input
                type="color" value={defaults.collar}
                onChange={(e) => s.patch({ mirrorDefaults: { ...defaults, collar: e.target.value.toUpperCase() } })}
                aria-label="Collar color"
              />
            )}
            {defaults.collar && s.onlyMyPaints && (
              <span className="flex max-w-[120px] flex-wrap gap-1">
                {s.palette.map((sw) => (
                  <button
                    key={sw.id}
                    title={`Collar ${sw.name}`}
                    aria-label={`Collar ${sw.name}`}
                    onClick={() => s.patch({ mirrorDefaults: { ...defaults, collar: sw.hex } })}
                    className={`h-6 w-6 rounded-full shadow-swatch ${defaults.collar === sw.hex ? 'ring-2 ring-brass' : ''}`}
                    style={{ background: sw.hex }}
                  />
                ))}
              </span>
            )}
          </span>
        </label>
      </section>

      <section>
        <div className="flex items-center gap-1.5">
          <IconRing size={16} />
          <SectionTitle>Radial array</SectionTitle>
        </div>
        <p className="mb-2 mt-0.5 text-[11px] text-inksoft">The signature Lippan layout — mirrors evenly on a ring, facing center.</p>
        <div className="flex flex-col gap-2.5">
          <Slider label="Mirrors on the ring" value={ringN} min={3} max={48} onChange={setRingN} />
          <Slider label="Ring radius" value={ringRadiusPct} min={10} max={98} unit="%" onChange={setRingRadiusPct} />
          <BrassButton
            full
            onClick={() =>
              addRadialArray({
                cx: center.x, cy: center.y, n: ringN,
                radius: (ringRadiusPct / 100) * (boardUnits / 2),
                shape: defaults.shape, sizeMm: defaults.sizeMm, collar: defaults.collar,
              })
            }
          >
            Add {ringN} mirrors on a ring
          </BrassButton>
        </div>
        {arrays.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {arrays.map((a) => (
              <ArrayEditor key={a.id} def={a} boardUnits={boardUnits} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Placed mirrors</SectionTitle>
        {proj.mirrors.length === 0 ? (
          <p className="mt-1.5 rounded-xl bg-bonedeep px-3 py-3 text-[12px] text-inksoft">
            Nothing placed yet — tap the board with the Mirror tool, or add a ring above.
          </p>
        ) : (
          <ul className="mt-1.5 flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
            {proj.mirrors.map((m) => (
              <li key={m.id}>
                <div
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors
                    ${s.selectedMirrorIds.includes(m.id) ? 'bg-brass/15 ring-1 ring-brass' : 'hover:bg-bonedeep'}`}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2"
                    onClick={() => s.patch({ selectedMirrorIds: [m.id], selectedRegion: null })}
                    aria-label={`Select ${m.shape} ${m.sizeMm}mm`}
                  >
                    <svg viewBox="-0.62 -0.62 1.24 1.24" width={16} height={16} className="shrink-0 text-inksoft">
                      <path d={shapeSvgPath(m.shape)} fill="currentColor" />
                    </svg>
                    <span className="truncate font-mono text-[11px]">
                      {m.shape} {m.sizeMm}mm{m.arrayId ? ' · ring' : ''}
                    </span>
                  </button>
                  <button title={m.visible ? 'Hide' : 'Show'} aria-label={m.visible ? 'Hide mirror' : 'Show mirror'}
                    onClick={() => toggleMirrorVisible(m.id)}
                    className="rounded-full p-1.5 text-inksoft hover:text-ink">
                    {m.visible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  </button>
                  <button title="Delete" aria-label="Delete mirror"
                    onClick={() => deleteMirrors([m.id])}
                    className="rounded-full p-1.5 text-clayred hover:bg-clayred hover:text-bone">
                    <IconTrash size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ArrayEditor({ def, boardUnits }: { def: RadialArrayDef; boardUnits: number }) {
  const before = useStore((s) => {
    const proj = activeProject(s)
    return { mirrors: proj.mirrors, arrays: proj.arrays }
  })
  const beforeRef = useState(() => before)[0]
  const memberIds = before.mirrors.filter((m) => m.arrayId === def.id).map((m) => m.id)
  return (
    <div className="rounded-xl bg-bonedeep p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium">{def.n} × {def.shape} {def.sizeMm}mm</span>
        <span className="flex gap-1">
          <QuietButton title="Make mirrors individually editable" onClick={() => explodeArray(def.id)}>Explode</QuietButton>
          <button title="Delete ring" aria-label="Delete ring"
            onClick={() => deleteMirrors(memberIds)}
            className="rounded-full p-1.5 text-clayred hover:bg-clayred hover:text-bone">
            <IconTrash size={14} />
          </button>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <Slider label="Count" value={def.n} min={3} max={48}
          onChange={(v) => updateArrayLive(def.id, { n: v })}
          onCommit={() => commitArrayGesture(beforeRef.mirrors, beforeRef.arrays)}
        />
        <Slider label="Radius" value={Math.round((def.radius / (boardUnits / 2)) * 100)} min={10} max={98} unit="%"
          onChange={(v) => updateArrayLive(def.id, { radius: (v / 100) * (boardUnits / 2) })}
          onCommit={() => commitArrayGesture(beforeRef.mirrors, beforeRef.arrays)}
        />
      </div>
    </div>
  )
}
