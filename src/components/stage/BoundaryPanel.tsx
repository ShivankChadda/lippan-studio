import { useState } from 'react'
import { detectBoundariesNow } from '../../state/actions/photo'
import { useStore } from '../../state/store'
import { BrassButton, Slider } from '../ui/primitives'
import { IconPen } from '../ui/icons'

/** Floating boundary controls on the photo stage: detection sliders + brush size. */
export function BoundaryPanel() {
  const tool = useStore((s) => s.tool)
  const sensitivity = useStore((s) => s.photo.edgeSensitivity)
  const thickness = useStore((s) => s.photo.edgeThickness)
  const brushSize = useStore((s) => s.brushSize)
  const busy = useStore((s) => s.busy)
  const patch = useStore((s) => s.patch)
  const patchPhoto = useStore((s) => s.patchPhoto)
  const [open, setOpen] = useState(true)
  const penActive = tool === 'pen' || tool === 'eraser'

  return (
    <div className="absolute left-3 top-3 z-20 w-56">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        data-testid="boundary-panel-toggle"
        className="flex w-full items-center gap-2 rounded-t-2xl bg-mud/90 px-3.5 py-2 text-[11px] font-bold uppercase tracking-label text-bone shadow-panel"
      >
        <IconPen size={13} /> Boundaries
        <span className="ml-auto">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 rounded-b-2xl bg-bone p-3 shadow-panel">
          <Slider
            label="Edge sensitivity" value={sensitivity} min={0} max={100}
            onChange={(v) => patchPhoto({ edgeSensitivity: v })}
          />
          <Slider
            label="Boundary thickness" value={thickness} min={1} max={3} unit=" px"
            onChange={(v) => patchPhoto({ edgeThickness: v })}
          />
          <BrassButton full disabled={!!busy} onClick={() => void detectBoundariesNow()} title="Re-run detection (keeps your paint, replaces the boundary mask)">
            Detect again
          </BrassButton>
          {penActive && (
            <Slider
              label="Brush size" value={brushSize} min={2} max={80} unit=" px"
              onChange={(v) => patch({ brushSize: v })}
            />
          )}
          <p className="text-[10.5px] leading-snug text-inksoft">
            Gaps in the orange overlay let paint leak — seal them with the pen (B), thin noise away with the eraser (E).
          </p>
        </div>
      )}
    </div>
  )
}
