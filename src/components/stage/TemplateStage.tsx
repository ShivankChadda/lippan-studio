import { useRef } from 'react'
import { UNPAINTED_CLAY, RIDGE_FALLBACK } from '../../lib/exporter'
import { getTemplate, TEMPLATES, VIEW } from '../../lib/templates'
import { addMirrorAt, unitsPerMm } from '../../state/actions/mirrors'
import { paintTemplateRegion, switchTemplate } from '../../state/actions/template'
import { useStore } from '../../state/store'
import { MirrorLayer, SvgSharedDefs } from './MirrorLayer'
import { BusyOverlay, MirrorCounterChip, RegionChip, VariantStrip } from './StageChrome'
import { StageViewport, useStage } from './StageViewport'

export function TemplateStage() {
  return (
    <div className="relative h-full">
      <StageViewport
        artW={VIEW}
        artH={VIEW}
        chrome={
          <>
            <TemplateBar />
            <MirrorCounterChip />
            <RegionChip />
            <VariantStrip />
            <BusyOverlay />
          </>
        }
      >
        <TemplatePlane />
      </StageViewport>
    </div>
  )
}

function TemplateBar() {
  const templateId = useStore((s) => s.template.templateId)
  const symmetry = useStore((s) => s.template.symmetry)
  const patchTemplate = useStore((s) => s.patchTemplate)
  return (
    <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-mud/85 px-2 py-1.5 shadow-panel">
      <select
        value={templateId}
        data-testid="template-select"
        aria-label="Template"
        onChange={(e) => switchTemplate(e.target.value)}
        className="rounded-full border-0 bg-transparent px-2 py-1 text-[12px] font-bold text-bone focus:outline-none [&>option]:text-ink"
      >
        {TEMPLATES.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <button
        data-testid="symmetry-toggle"
        aria-pressed={symmetry}
        onClick={() => patchTemplate({ symmetry: !symmetry })}
        title="Radial symmetry — paint one petal, fill them all"
        className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-label transition-colors duration-200
          ${symmetry ? 'bg-brass text-bone' : 'text-bone/70 hover:text-bone'}`}
      >
        Symmetry
      </button>
    </div>
  )
}

function TemplatePlane() {
  const { toArt } = useStage()
  const templateId = useStore((s) => s.template.templateId)
  const fills = useStore((s) => s.template.fills)
  const ridge = useStore((s) => s.template.ridge)
  const mirrors = useStore((s) => s.template.mirrors)
  const tool = useStore((s) => s.tool)
  const lightSweep = useStore((s) => s.lightSweep)
  const patch = useStore((s) => s.patch)
  const def = getTemplate(templateId)
  const upm = unitsPerMm({ ...useStore.getState(), mode: 'template' })
  const down = useRef<{ x: number; y: number } | null>(null)

  const stroke = ridge.color ? (ridge.metallic ? 'url(#ridgegrad)' : ridge.color) : RIDGE_FALLBACK

  const onRegionUp = (regionId: string, e: React.PointerEvent) => {
    const d = down.current
    down.current = null
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7) return
    if (tool === 'fill') {
      paintTemplateRegion(regionId)
    } else if (tool === 'select') {
      patch({ selectedRegion: { mode: 'template', id: regionId }, selectedMirrorIds: [] })
    } else if (tool === 'eyedropper') {
      const hex = useStore.getState().template.fills[regionId]
      if (hex) patch({ activeColor: hex, activeSwatchId: useStore.getState().palette.find((p) => p.hex === hex)?.id ?? null, tool: 'fill' })
    } else if (tool === 'mirror') {
      const p = toArt(e.clientX, e.clientY)
      addMirrorAt(p.x, p.y)
    }
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={VIEW}
      height={VIEW}
      className={`${lightSweep ? 'sweep-on' : ''}`}
      style={{ filter: 'drop-shadow(0 18px 30px rgba(16,8,3,0.55))' }}
      data-testid="template-svg"
    >
      <SvgSharedDefs ridge={ridge} />
      {def.regions.map((r) => (
        <path
          key={r.id}
          d={r.d}
          data-testid={`region-${r.id}`}
          fill={fills[r.id] ?? UNPAINTED_CLAY}
          fillRule="evenodd"
          stroke={stroke}
          strokeWidth={7}
          strokeLinejoin="round"
          style={{ transition: 'fill 200ms ease-out', cursor: tool === 'fill' ? 'pointer' : undefined }}
          onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY } }}
          onPointerUp={(e) => onRegionUp(r.id, e)}
        />
      ))}
      <MirrorLayer mirrors={mirrors} upm={upm} artW={VIEW} interactive />
    </svg>
  )
}
