import { countMirrors } from '../../lib/mirrors'
import { activeProject, useStore } from '../../state/store'
import { BrassButton } from '../ui/primitives'
import { IconPrint } from '../ui/icons'
import { Modal } from './Modal'

export function MaterialSheet() {
  const s = useStore()
  const proj = activeProject(s)
  const mirrors = countMirrors(proj.mirrors.filter((m) => m.visible))

  // paints actually used, with approximate area share
  let paints: { name: string; hex: string; share: number }[] = []
  if (s.mode === 'photo') {
    const fills = Object.values(s.photo.fills)
    const total = fills.reduce((a, f) => a + f.areaPx, 0) || 1
    const byColor = new Map<string, number>()
    for (const f of fills) byColor.set(f.colorHex, (byColor.get(f.colorHex) ?? 0) + f.areaPx)
    paints = [...byColor.entries()].map(([hex, area]) => ({
      hex,
      name: s.palette.find((p) => p.hex === hex)?.name ?? hex,
      share: area / total,
    }))
  } else {
    const counts = new Map<string, number>()
    for (const hex of Object.values(s.template.fills)) counts.set(hex, (counts.get(hex) ?? 0) + 1)
    const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1
    paints = [...counts.entries()].map(([hex, n]) => ({
      hex,
      name: s.palette.find((p) => p.hex === hex)?.name ?? hex,
      share: n / total,
    }))
  }
  paints.sort((a, b) => b.share - a.share)

  const print = () => window.print()

  return (
    <Modal title="Material list" wide>
      <div className="print-sheet rounded-2xl bg-white p-6 shadow-swatch" data-testid="material-sheet">
        <div className="mb-5 flex items-baseline justify-between border-b-2 border-bonedeep pb-3">
          <div>
            <h1 className="font-display text-[22px] font-bold">{s.projectName}</h1>
            <p className="text-[11px] text-inksoft">Lippan Studio · material plan</p>
          </div>
          <div className="text-right font-mono text-[11px] text-inksoft">
            <div>{new Date().toLocaleDateString()}</div>
            <div>Board ⌀ {proj.boardCm} cm</div>
          </div>
        </div>

        <h2 className="label-caps mb-2">Paints</h2>
        {paints.length === 0 ? (
          <p className="mb-4 text-[12px] text-inksoft">No regions painted yet.</p>
        ) : (
          <table className="mb-5 w-full text-[12px]">
            <thead>
              <tr className="border-b border-bonedeep text-left">
                <th className="py-1.5 font-bold">Paint</th>
                <th className="py-1.5 font-bold">Hex</th>
                <th className="py-1.5 text-right font-bold">Area share</th>
              </tr>
            </thead>
            <tbody>
              {paints.map((p) => (
                <tr key={p.hex} className="border-b border-bonedeep/60">
                  <td className="flex items-center gap-2 py-1.5 font-semibold">
                    <span className="inline-block h-4 w-4 rounded-full shadow-swatch" style={{ background: p.hex }} />
                    {p.name}
                  </td>
                  <td className="py-1.5 font-mono">{p.hex}</td>
                  <td className="py-1.5 text-right font-mono">{Math.round(p.share * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className="label-caps mb-2">Mirrors (aabhla)</h2>
        {mirrors.length === 0 ? (
          <p className="text-[12px] text-inksoft">No mirrors placed yet.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-bonedeep text-left">
                <th className="py-1.5 font-bold">Shape</th>
                <th className="py-1.5 font-bold">Size</th>
                <th className="py-1.5 text-right font-bold">Count</th>
              </tr>
            </thead>
            <tbody>
              {mirrors.map((m) => (
                <tr key={`${m.shape}-${m.sizeMm}`} className="border-b border-bonedeep/60">
                  <td className="py-1.5 font-semibold capitalize">{m.shape}</td>
                  <td className="py-1.5 font-mono">{m.sizeMm} mm</td>
                  <td className="py-1.5 text-right font-mono">{m.count}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1.5 font-bold" colSpan={2}>Total mirrors</td>
                <td className="py-1.5 text-right font-mono font-bold">{mirrors.reduce((a, m) => a + m.count, 0)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
      <div className="no-print mt-4">
        <BrassButton onClick={print}><IconPrint size={15} /> Print one-page list</BrassButton>
      </div>
    </Modal>
  )
}
