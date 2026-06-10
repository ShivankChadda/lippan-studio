import { useEffect, useRef, useState } from 'react'
import { downloadCanvasPng, renderWallScene } from '../../lib/exporter'
import { fileToCanvas } from '../../lib/image'
import { activeProject, patchActive, useStore } from '../../state/store'
import { BrassButton, QuietButton, Slider } from '../ui/primitives'
import { Modal } from './Modal'

const WALLS = [
  { id: 'warm', name: 'Warm white', hex: '#F1E9DC' },
  { id: 'sage', name: 'Sage', hex: '#A8B49A' },
  { id: 'terracotta', name: 'Terracotta', hex: '#C07A57' },
  { id: 'teal', name: 'Deep teal', hex: '#2F4F4D' },
]

export function WallModal() {
  const boardCm = useStore((s) => activeProject(s).boardCm)
  const [wall, setWall] = useState('#F1E9DC')
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    const mySeq = ++seq.current
    const t = window.setTimeout(() => {
      void renderWallScene(wall, boardCm, photo).then((c) => {
        if (seq.current === mySeq) setUrl(c.toDataURL('image/jpeg', 0.85))
      })
    }, 120)
    return () => window.clearTimeout(t)
  }, [wall, boardCm, photo])

  return (
    <Modal title="On the wall" wide>
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-2xl bg-bonedeep">
          {url
            ? <img src={url} alt="Wall preview" className="block w-full" />
            : <div className="flex aspect-[16/11] items-center justify-center text-[12px] text-inksoft">Painting the wall…</div>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-caps">Wall</span>
          {WALLS.map((w) => (
            <button
              key={w.id}
              title={w.name}
              onClick={() => { setPhoto(null); setWall(w.hex) }}
              className={`swatch-round h-9 w-9 ${wall === w.hex && !photo ? 'ring-2 ring-brass ring-offset-2 ring-offset-bone' : ''}`}
              style={{ background: w.hex }}
              aria-label={w.name}
            />
          ))}
          <input
            type="color" value={wall} aria-label="Custom wall color"
            onChange={(e) => { setPhoto(null); setWall(e.target.value) }}
          />
          <QuietButton onClick={() => fileRef.current?.click()}>My wall photo</QuietButton>
          {photo && <QuietButton onClick={() => setPhoto(null)}>Remove photo</QuietButton>}
          <input
            ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void fileToCanvas(f).then(setPhoto).catch(() => useStore.getState().toast('Couldn’t open that photo.', 'error'))
              e.target.value = ''
            }}
          />
        </div>
        <div className="max-w-sm">
          <Slider
            label="Board diameter" value={boardCm} min={15} max={90} unit=" cm"
            onChange={(v) => patchActive({ boardCm: v })}
          />
        </div>
        <BrassButton onClick={() => void renderWallScene(wall, boardCm, photo).then((c) => downloadCanvasPng(c, 'lippan-wall.png'))}>
          Download this view
        </BrassButton>
      </div>
    </Modal>
  )
}
