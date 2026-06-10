import { useEffect, useRef, useState } from 'react'
import { buildTemplateSvgString, renderComposite } from '../../lib/exporter'
import { activeProject, useStore } from '../../state/store'
import { Segmented } from '../ui/primitives'
import { Modal } from './Modal'

export function CompareModal() {
  const variants = useStore((s) => activeProject(s).variants)
  const [view, setView] = useState<'ab' | 'slider'>('slider')
  const [aId, setAId] = useState(variants[0]?.id ?? '')
  const [bId, setBId] = useState(variants[1]?.id ?? variants[0]?.id ?? '')
  const a = variants.find((v) => v.id === aId)
  const b = variants.find((v) => v.id === bId)

  return (
    <Modal title="Compare" wide>
      <div className="flex flex-col gap-4">
        <Segmented
          value={view} onChange={setView}
          options={[
            { id: 'slider', label: 'Before / after' },
            { id: 'ab', label: 'Two variants' },
          ]}
        />
        {view === 'ab' ? (
          variants.length < 2 ? (
            <p className="rounded-xl bg-bonedeep px-3 py-4 text-center text-[12px] text-inksoft">
              Save at least two variants to compare them side by side.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                {[{ v: a, set: setAId, val: aId }, { v: b, set: setBId, val: bId }].map((slot, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <select
                      value={slot.val} onChange={(e) => slot.set(e.target.value)}
                      aria-label={`Variant ${i === 0 ? 'A' : 'B'}`}
                      className="rounded-lg border border-inksoft/20 bg-bone px-2 py-1.5 text-[12px] font-semibold"
                    >
                      {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <div className="mud-wall flex aspect-square items-center justify-center rounded-2xl p-4">
                      {slot.v && <img src={slot.v.preview} alt={slot.v.name} className="max-h-full max-w-full rounded-lg shadow-piece" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <BeforeAfter />
        )}
      </div>
    </Modal>
  )
}

function BeforeAfter() {
  const mode = useStore((s) => s.mode)
  const baseDataUrl = useStore((s) => s.photo.baseDataUrl)
  const [pos, setPos] = useState(50)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  useEffect(() => {
    let alive = true
    void renderComposite(900).then((c) => { if (alive) setCurrentUrl(c.toDataURL('image/jpeg', 0.85)) })
    if (mode === 'photo') {
      setBeforeUrl(baseDataUrl)
    } else {
      const s = useStore.getState()
      const svg = buildTemplateSvgString({
        templateId: s.template.templateId, fills: {}, ridge: { color: null, metallic: false },
        mirrors: [], boardCm: s.template.boardCm,
      })
      setBeforeUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
    }
    return () => { alive = false }
  }, [mode, baseDataUrl])

  const move = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)))
  }

  if (!beforeUrl) {
    return <p className="rounded-xl bg-bonedeep px-3 py-4 text-center text-[12px] text-inksoft">Open a photo or template first.</p>
  }

  return (
    <div
      ref={boxRef}
      className="mud-wall relative mx-auto aspect-square w-full max-w-xl touch-none select-none overflow-hidden rounded-2xl"
      onPointerDown={(e) => { dragging.current = true; move(e.clientX); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => { if (dragging.current) move(e.clientX) }}
      onPointerUp={() => { dragging.current = false }}
      data-testid="before-after"
    >
      <img src={beforeUrl} alt="Unpainted" className="absolute inset-0 m-auto max-h-full max-w-full" draggable={false} />
      {currentUrl && (
        <img
          src={currentUrl} alt="Painted" draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
      )}
      <div className="absolute bottom-0 top-0 w-0.5 bg-brasslight" style={{ left: `${pos}%` }} />
      <div
        className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brass text-bone shadow-panel"
        style={{ left: `${pos}%` }}
      >
        ⇆
      </div>
      <span className="label-caps absolute left-3 top-3 rounded-full bg-mud/80 px-2.5 py-1 !text-bone/90">Before</span>
      <span className="label-caps absolute right-3 top-3 rounded-full bg-mud/80 px-2.5 py-1 !text-bone/90">After</span>
    </div>
  )
}
