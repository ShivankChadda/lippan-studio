import { useRef, useState } from 'react'
import { rgbToHex } from '../../lib/color'
import type { ExtractedColor } from '../../lib/kmeans'
import { uid } from '../../lib/presets'
import { analyzePaintPhoto } from '../../state/actions/palette'
import { useStore } from '../../state/store'
import type { Swatch } from '../../types'
import { BrassButton, QuietButton, SectionTitle } from '../ui/primitives'
import { Modal } from './Modal'

export function ExtractModal() {
  const patch = useStore((s) => s.patch)
  const palette = useStore((s) => s.palette)
  const toast = useStore((s) => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null)
  const [proposals, setProposals] = useState<(ExtractedColor & { keep: boolean })[]>([])
  const [picked, setPicked] = useState<string[]>([])

  const onFile = async (f: File) => {
    const result = await analyzePaintPhoto(f)
    if (!result) return
    setPhoto(result.canvas)
    setProposals(result.colors.map((c) => ({ ...c, keep: true })))
    setPicked([])
    if (result.colors.length === 0) {
      toast('No paint colors stood out — tap each jar in the photo instead.', 'info')
    }
  }

  const sampleAt = (e: React.PointerEvent) => {
    if (!photo) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * photo.width)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * photo.height)
    const ctx = photo.getContext('2d', { willReadFrequently: true })!
    // average a small patch — single pixels are noisy on jar photos
    const r = 4
    const data = ctx.getImageData(Math.max(0, x - r), Math.max(0, y - r), r * 2, r * 2).data
    let sr = 0, sg = 0, sb = 0, n = 0
    for (let i = 0; i < data.length; i += 4) { sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++ }
    const hex = rgbToHex(sr / n, sg / n, sb / n)
    setPicked((p) => (p.includes(hex) ? p : [...p, hex]))
  }

  const addAll = () => {
    const newSwatches: Swatch[] = [
      ...proposals.filter((p) => p.keep).map((p, i) => ({ id: uid('sw'), name: `Paint ${palette.length + i + 1}`, hex: p.hex })),
      ...picked.map((hex, i) => ({ id: uid('sw'), name: `Sampled ${i + 1}`, hex })),
    ]
    if (newSwatches.length === 0) return
    const existing = new Set(palette.map((p) => p.hex))
    const unique = newSwatches.filter((sw) => !existing.has(sw.hex))
    patch({ palette: [...palette, ...unique], modal: 'none' })
    toast(`Added ${unique.length} paint${unique.length === 1 ? '' : 's'} to your palette.`, 'success')
  }

  return (
    <Modal title="Paints from a photo" wide>
      <div className="flex flex-col gap-4">
        {!photo ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-inksoft/25 p-8 text-center">
            <p className="max-w-sm text-[12.5px] leading-relaxed text-inksoft">
              Photograph your open jars from above in daylight. We’ll propose swatches —
              and you can tap each jar to sample it precisely.
            </p>
            <BrassButton onClick={() => fileRef.current?.click()}>Choose paint photo</BrassButton>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <SectionTitle>Tap a jar to sample it</SectionTitle>
              <div className="mt-2 overflow-hidden rounded-xl" onPointerDown={sampleAt}>
                <img src={photo.toDataURL()} alt="Your paints" className="block w-full cursor-copy" draggable={false} />
              </div>
              <QuietButton onClick={() => fileRef.current?.click()}>Different photo</QuietButton>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <SectionTitle>Proposed paints</SectionTitle>
                {proposals.length === 0 ? (
                  <p className="mt-1.5 text-[12px] text-inksoft">Nothing confident enough to propose.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {proposals.map((p, i) => (
                      <button
                        key={i}
                        title={`${p.hex} — tap to ${p.keep ? 'skip' : 'keep'}`}
                        onClick={() => setProposals((ps) => ps.map((q, j) => (j === i ? { ...q, keep: !q.keep } : q)))}
                        className={`swatch-round h-10 w-10 ${p.keep ? 'ring-2 ring-brass ring-offset-2 ring-offset-bone' : 'opacity-35'}`}
                        style={{ background: p.hex }}
                        aria-label={`${p.hex} ${p.keep ? 'kept' : 'skipped'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {picked.length > 0 && (
                <div>
                  <SectionTitle>Sampled by tap</SectionTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {picked.map((hex) => (
                      <button
                        key={hex} title={`${hex} — tap to remove`}
                        onClick={() => setPicked((p) => p.filter((q) => q !== hex))}
                        className="swatch-round h-10 w-10 ring-2 ring-sage ring-offset-2 ring-offset-bone"
                        style={{ background: hex }}
                        aria-label={`Remove ${hex}`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <BrassButton full onClick={addAll}>
                Add {proposals.filter((p) => p.keep).length + picked.length} paints to my palette
              </BrassButton>
            </div>
          </div>
        )}
        <input
          ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = '' }}
        />
      </div>
    </Modal>
  )
}
