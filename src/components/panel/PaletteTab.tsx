import { useState } from 'react'
import { harmonies, nearestInPalette } from '../../lib/color'
import { PALETTE_PRESETS, RIDGE_FINISHES } from '../../lib/presets'
import { applyPreset, addSwatch, pickSwatch, removeSwatch, reorderSwatch, updateSwatch } from '../../state/actions/palette'
import { applyStrengthToSelection, setRidgeStyle, shuffleColors } from '../../state/actions/template'
import { activeProject, useStore } from '../../state/store'
import { BrassButton, QuietButton, SectionTitle, Slider } from '../ui/primitives'
import { IconImage, IconPlus, IconShuffle, IconTrash } from '../ui/icons'

export function PaletteTab() {
  const palette = useStore((s) => s.palette)
  const activeSwatchId = useStore((s) => s.activeSwatchId)
  const activeColor = useStore((s) => s.activeColor)
  const onlyMyPaints = useStore((s) => s.onlyMyPaints)
  const strength = useStore((s) => s.strength)
  const tolerance = useStore((s) => s.tolerance)
  const mode = useStore((s) => s.mode)
  const patch = useStore((s) => s.patch)
  const [hexDraft, setHexDraft] = useState('#B2603C')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const selected = palette.find((p) => p.id === activeSwatchId)

  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>My paints</SectionTitle>
          <button
            onClick={() => patch({ modal: 'extract' })}
            title="Extract colors from a photo of your paint jars"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-brass hover:bg-bonedeep"
          >
            <IconImage size={15} /> From a photo
          </button>
        </div>
        {palette.length === 0 ? (
          <p className="rounded-xl bg-bonedeep px-3 py-3 text-[12px] leading-relaxed text-inksoft">
            No paints yet. Photograph your jars and extract them, pick a preset below, or add a color by hand.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5" data-testid="swatch-grid">
            {palette.map((sw, i) => (
              <button
                key={sw.id}
                title={`${sw.name} ${sw.hex}`}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdx !== null) reorderSwatch(dragIdx, i); setDragIdx(null) }}
                onClick={() => pickSwatch(sw.id)}
                className={`swatch-round h-9 w-9 max-sm:h-11 max-sm:w-11 ${activeSwatchId === sw.id ? 'ring-2 ring-brass ring-offset-2 ring-offset-bone' : ''}`}
                style={{ background: sw.hex }}
                aria-label={`Pick ${sw.name}`}
              />
            ))}
          </div>
        )}
        {selected && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-bonedeep p-2">
            <input
              type="color"
              value={selected.hex}
              onChange={(e) => updateSwatch(selected.id, { hex: e.target.value.toUpperCase() })}
              aria-label="Swatch color"
            />
            <input
              value={selected.name}
              onChange={(e) => updateSwatch(selected.id, { name: e.target.value })}
              aria-label="Swatch name"
              className="min-w-0 flex-1 rounded-lg border border-inksoft/20 bg-bone px-2 py-1.5 text-[12px] font-semibold"
            />
            <span className="font-mono text-[11px] text-inksoft">{selected.hex}</span>
            <button
              title="Delete swatch" aria-label="Delete swatch"
              onClick={() => removeSwatch(selected.id)}
              className="rounded-full p-1.5 text-clayred hover:bg-clayred hover:text-bone"
            >
              <IconTrash size={14} />
            </button>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(hexDraft) ? hexDraft : '#B2603C'}
            onChange={(e) => setHexDraft(e.target.value.toUpperCase())}
            aria-label="New color"
          />
          <input
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            aria-label="Hex value"
            className="w-24 rounded-lg border border-inksoft/20 bg-bone px-2 py-1.5 font-mono text-[11px]"
            data-testid="hex-input"
          />
          <BrassButton onClick={() => addSwatch(hexDraft)} title="Add to my paints">
            <IconPlus size={14} /> Add
          </BrassButton>
        </div>
        <div className="mt-3">
          <label className="label-caps mb-1 block" htmlFor="preset-select">Preset palettes</label>
          <select
            id="preset-select"
            data-testid="preset-select"
            className="w-full rounded-lg border border-inksoft/20 bg-bone px-2 py-2 text-[12px] font-semibold"
            value=""
            onChange={(e) => { if (e.target.value) applyPreset(e.target.value) }}
          >
            <option value="">Load a preset…</option>
            {PALETTE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.blurb}</option>
            ))}
          </select>
        </div>
        <label className="mt-3 flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl bg-bonedeep px-3 py-2">
          <span>
            <span className="block text-[12px] font-bold">Only my paints</span>
            <span className="block text-[11px] text-inksoft">Every color control sticks to this palette</span>
          </span>
          <input
            type="checkbox"
            data-testid="only-my-paints"
            checked={onlyMyPaints}
            onChange={(e) => patch({ onlyMyPaints: e.target.checked })}
            className="h-5 w-5 accent-[var(--brass)]"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Brush & paint feel</SectionTitle>
        <Slider
          label="Paint strength" value={Math.round(strength * 100)} min={50} max={100} unit="%"
          onChange={(v) => patch({ strength: v / 100 })}
          onCommit={() => void applyStrengthToSelection(useStore.getState().strength)}
        />
        {mode === 'photo' && (
          <Slider label="Fill tolerance" value={tolerance} min={4} max={60}
            onChange={(v) => patch({ tolerance: v })} />
        )}
        <QuietButton onClick={() => void shuffleColors()} title="Randomize all unlocked regions">
          <IconShuffle size={15} /> Shuffle unlocked regions
        </QuietButton>
      </section>

      <HarmonySection activeColor={activeColor} />
      <RidgeSection />
    </div>
  )
}

function HarmonySection({ activeColor }: { activeColor: string }) {
  const palette = useStore((s) => s.palette)
  const onlyMyPaints = useStore((s) => s.onlyMyPaints)
  const patch = useStore((s) => s.patch)
  const schemes = harmonies(activeColor)
  const mapColor = (hex: string) =>
    onlyMyPaints && palette.length > 0 ? palette[nearestInPalette(hex, palette.map((p) => p.hex))].hex : hex

  const row = (label: string, colors: string[]) => (
    <div className="flex items-center justify-between gap-2">
      <span className="label-caps">{label}</span>
      <div className="flex gap-1.5">
        {colors.map((c, i) => {
          const mapped = mapColor(c)
          return (
            <button
              key={i}
              title={`Use ${mapped}`}
              onClick={() => patch({ activeColor: mapped, activeSwatchId: palette.find((p) => p.hex === mapped)?.id ?? null })}
              className="swatch-round h-7 w-7"
              style={{ background: mapped }}
              aria-label={`Use ${mapped}`}
            />
          )
        })}
      </div>
    </div>
  )

  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Harmony from your color</SectionTitle>
      <div className="flex items-center gap-2 text-[12px] font-semibold text-inksoft">
        Base <span className="h-5 w-5 rounded-full shadow-swatch" style={{ background: activeColor }} />
        <span className="font-mono text-[11px]">{activeColor}</span>
        {useStore.getState().onlyMyPaints && <span className="text-[10px]">(mapped to your paints)</span>}
      </div>
      {row('Complementary', schemes.complementary)}
      {row('Analogous', schemes.analogous)}
      {row('Triadic', schemes.triadic)}
    </section>
  )
}

function RidgeSection() {
  const mode = useStore((s) => s.mode)
  const ridge = useStore((s) => activeProject(s).ridge)
  const palette = useStore((s) => s.palette)
  const onlyMyPaints = useStore((s) => s.onlyMyPaints)
  return (
    <section>
      <SectionTitle>Ridge finish</SectionTitle>
      <p className="mb-2 mt-0.5 text-[11px] text-inksoft">One finish for every clay rope{mode === 'photo' ? ' — needs boundaries detected' : ''}.</p>
      <div className="flex flex-wrap gap-2">
        {RIDGE_FINISHES.map((f) => (
          <button
            key={f.id}
            data-testid={`ridge-${f.id}`}
            title={f.name}
            onClick={() => setRidgeStyle({ color: f.hex, metallic: f.metallic })}
            className={`swatch-round h-9 w-9 max-sm:h-11 max-sm:w-11 ${ridge.color === f.hex ? 'ring-2 ring-brass ring-offset-2 ring-offset-bone' : ''}`}
            style={{
              background: f.metallic
                ? `linear-gradient(135deg, ${f.hex} 0%, #FFF6DE 45%, ${f.hex} 75%)`
                : f.hex,
            }}
            aria-label={`Ridge ${f.name}`}
          />
        ))}
        {!onlyMyPaints && (
          <input
            type="color"
            value={ridge.color ?? '#F4EFE4'}
            onChange={(e) => setRidgeStyle({ color: e.target.value.toUpperCase(), metallic: false })}
            title="Any ridge color"
            aria-label="Custom ridge color"
          />
        )}
        {onlyMyPaints && palette.map((sw) => (
          <button
            key={sw.id}
            title={`Ridge ${sw.name}`}
            onClick={() => setRidgeStyle({ color: sw.hex, metallic: false })}
            className={`swatch-round h-9 w-9 ${ridge.color === sw.hex ? 'ring-2 ring-brass ring-offset-2 ring-offset-bone' : ''}`}
            style={{ background: sw.hex }}
            aria-label={`Ridge ${sw.name}`}
          />
        ))}
        <button
          onClick={() => setRidgeStyle({ color: null, metallic: false })}
          title="Bare clay (no finish)"
          className={`h-9 rounded-full border border-inksoft/30 px-3 text-[11px] font-bold text-inksoft hover:border-brass hover:text-brass ${!ridge.color ? 'ring-2 ring-brass' : ''}`}
        >
          Bare
        </button>
      </div>
    </section>
  )
}
