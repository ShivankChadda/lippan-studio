import { useRef, useState } from 'react'
import { downloadCanvasPng, renderArtExport, renderComposite, renderWallScene } from '../../lib/exporter'
import { exportProjectFile, importProjectFile } from '../../state/actions/project'
import { activeProject, useStore } from '../../state/store'
import { BrassButton, QuietButton, Segmented, SectionTitle } from '../ui/primitives'
import { IconPrint } from '../ui/icons'
import { Modal } from './Modal'

export function ExportModal() {
  const projectName = useStore((s) => s.projectName)
  const patch = useStore((s) => s.patch)
  const [scale, setScale] = useState<'1' | '2'>('1')
  const [busyLocal, setBusyLocal] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const safeName = projectName.replace(/[^\w\- ]+/g, '').trim() || 'lippan'

  const run = async (fn: () => Promise<void>) => {
    setBusyLocal(true)
    try { await fn() } finally { setBusyLocal(false) }
  }

  const exportArt = () =>
    run(async () => {
      const canvas = await renderArtExport(scale === '2' ? 2 : 1)
      await downloadCanvasPng(canvas, `${safeName}-artwork@${scale}x.png`)
    })

  const exportWall = () =>
    run(async () => {
      const s = useStore.getState()
      const canvas = await renderWallScene('#F1E9DC', activeProject(s).boardCm, null)
      if (scale === '2') {
        const big = document.createElement('canvas')
        big.width = canvas.width * 2
        big.height = canvas.height * 2
        big.getContext('2d')!.drawImage(canvas, 0, 0, big.width, big.height)
        await downloadCanvasPng(big, `${safeName}-wall@2x.png`)
      } else {
        await downloadCanvasPng(canvas, `${safeName}-wall@1x.png`)
      }
    })

  const exportCompare = () =>
    run(async () => {
      const s = useStore.getState()
      const current = await renderComposite(900)
      let beforeImg: HTMLCanvasElement
      if (s.mode === 'photo' && s.photo.baseDataUrl) {
        const { dataUrlToCanvas } = await import('../../lib/image')
        beforeImg = await dataUrlToCanvas(s.photo.baseDataUrl)
      } else {
        const { rasterizeSvg, buildTemplateSvgString } = await import('../../lib/exporter')
        beforeImg = await rasterizeSvg(
          buildTemplateSvgString({
            templateId: s.template.templateId, fills: {}, ridge: { color: null, metallic: false },
            mirrors: [], boardCm: s.template.boardCm,
          }), 900, 900)
      }
      const k = scale === '2' ? 2 : 1
      const tile = 560 * k, pad = 24 * k, label = 44 * k
      const c = document.createElement('canvas')
      c.width = tile * 2 + pad * 3
      c.height = tile + pad * 2 + label
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#F6F0E3'
      ctx.fillRect(0, 0, c.width, c.height)
      const draw = (img: HTMLCanvasElement, x: number, name: string) => {
        const s2 = Math.min(tile / img.width, tile / img.height)
        ctx.drawImage(img, x + (tile - img.width * s2) / 2, pad + (tile - img.height * s2) / 2, img.width * s2, img.height * s2)
        ctx.fillStyle = '#3A2B1E'
        ctx.font = `700 ${15 * k}px Mulish, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(name, x + tile / 2, pad + tile + 28 * k)
      }
      draw(beforeImg, pad, 'Before')
      draw(current, tile + pad * 2, 'After')
      await downloadCanvasPng(c, `${safeName}-compare@${scale}x.png`)
    })

  return (
    <Modal title="Export">
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <SectionTitle>Images</SectionTitle>
            <Segmented small value={scale} onChange={setScale}
              options={[{ id: '1', label: '1×' }, { id: '2', label: '2×' }]} />
          </div>
          <BrassButton full disabled={busyLocal} onClick={() => void exportArt()}>Artwork PNG</BrassButton>
          <QuietButton full disabled={busyLocal} onClick={() => void exportWall()}>Artwork on a wall</QuietButton>
          <QuietButton full disabled={busyLocal} onClick={() => void exportCompare()}>Before / after frame</QuietButton>
        </section>
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Materials</SectionTitle>
          <QuietButton full onClick={() => patch({ modal: 'material' })}>
            <IconPrint size={15} /> Material list & print
          </QuietButton>
        </section>
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Project file</SectionTitle>
          <p className="text-[11px] leading-relaxed text-inksoft">
            Everything — photo, boundaries, paint, mirrors, variants — in one portable .lippan.json.
          </p>
          <div className="flex gap-2">
            <BrassButton full onClick={exportProjectFile}>Export project</BrassButton>
            <QuietButton full onClick={() => importRef.current?.click()}>Import project</QuietButton>
          </div>
          <input
            ref={importRef} type="file" accept=".json,application/json" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importProjectFile(f).then(() => patch({ modal: 'none' }))
              e.target.value = ''
            }}
          />
        </section>
      </div>
    </Modal>
  )
}
