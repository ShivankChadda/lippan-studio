/**
 * Six built-in Lippan mandala templates as clean closed SVG paths on a
 * 1000×1000 viewBox. Regions sharing a `group` fill together when radial
 * symmetry is on. Paint order = array order (first is bottom).
 */
export interface TemplateRegion {
  id: string
  d: string
  group: string
}

export interface TemplateDef {
  id: string
  name: string
  blurb: string
  regions: TemplateRegion[]
}

export const VIEW = 1000
const CX = 500
const CY = 500
/** template board circle radius in viewBox units (maps to the board diameter in cm) */
export const TEMPLATE_BOARD_RADIUS = 470

const f = (v: number) => v.toFixed(2)
const pt = (a: number, r: number, cx = CX, cy = CY): [number, number] =>
  [cx + Math.cos(a) * r, cy + Math.sin(a) * r]

function circle(r: number, cx = CX, cy = CY): string {
  return `M ${f(cx - r)} ${f(cy)} a ${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a ${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`
}

function annulus(rOuter: number, rInner: number): string {
  return `${circle(rOuter)} ${circle(rInner)}`
}

function sector(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = pt(a0, r1)
  const [x1, y1] = pt(a1, r1)
  const [x2, y2] = pt(a1, r0)
  const [x3, y3] = pt(a0, r0)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return (
    `M ${f(x0)} ${f(y0)} A ${f(r1)} ${f(r1)} 0 ${large} 1 ${f(x1)} ${f(y1)} ` +
    `L ${f(x2)} ${f(y2)} A ${f(r0)} ${f(r0)} 0 ${large} 0 ${f(x3)} ${f(y3)} Z`
  )
}

function petal(angle: number, halfAngle: number, r0: number, r1: number): string {
  const [bx0, by0] = pt(angle - halfAngle, r0)
  const [bx1, by1] = pt(angle + halfAngle, r0)
  const [tx, ty] = pt(angle, r1)
  const rm = r0 + (r1 - r0) * 0.58
  const [c0x, c0y] = pt(angle - halfAngle * 1.18, rm)
  const [c1x, c1y] = pt(angle + halfAngle * 1.18, rm)
  return (
    `M ${f(bx0)} ${f(by0)} Q ${f(c0x)} ${f(c0y)} ${f(tx)} ${f(ty)} ` +
    `Q ${f(c1x)} ${f(c1y)} ${f(bx1)} ${f(by1)} A ${f(r0)} ${f(r0)} 0 0 0 ${f(bx0)} ${f(by0)} Z`
  )
}

/** polygon at polar position, rotated so local +y points away from center */
function polyAt(angle: number, r: number, rel: [number, number][]): string {
  const [cx, cy] = pt(angle, r)
  const rot = angle + Math.PI / 2
  const cos = Math.cos(rot), sin = Math.sin(rot)
  const pts = rel.map(([x, y]) => `${f(cx + x * cos - y * sin)} ${f(cy + x * sin + y * cos)}`)
  return `M ${pts.join(' L ')} Z`
}

function dropletAt(angle: number, r: number, size: number): string {
  // pointed end outward (local -y is outward after +90° rotation below)
  const [cx, cy] = pt(angle, r)
  const rot = angle - Math.PI / 2
  const cos = Math.cos(rot), sin = Math.sin(rot)
  const tx = (x: number, y: number) => `${f(cx + x * cos - y * sin)} ${f(cy + x * sin + y * cos)}`
  return (
    `M ${tx(0, size)} Q ${tx(size * 0.72, size * 0.05)} ${tx(0, -size)} ` +
    `Q ${tx(-size * 0.72, size * 0.05)} ${tx(0, size)} Z`
  )
}

function ring(n: number, fn: (angle: number, i: number) => TemplateRegion): TemplateRegion[] {
  const out: TemplateRegion[] = []
  for (let i = 0; i < n; i++) fn(-Math.PI / 2 + (i * 2 * Math.PI) / n, i)
  return out
}

function petals(n: number, group: string, r0: number, r1: number, width = 0.82, offset = 0): TemplateRegion[] {
  const regions: TemplateRegion[] = []
  const half = (Math.PI / n) * width
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + ((i + offset) * 2 * Math.PI) / n
    regions.push({ id: `${group}-${i}`, d: petal(a, half, r0, r1), group })
  }
  return regions
}

const board: TemplateRegion = { id: 'board', d: circle(TEMPLATE_BOARD_RADIUS), group: 'board' }

function lotus8(): TemplateDef {
  return {
    id: 'lotus8',
    name: '8-petal lotus',
    blurb: 'The classic — broad petals around a double center',
    regions: [
      board,
      ...petals(8, 'petal', 165, 430),
      { id: 'ring', d: annulus(165, 115), group: 'ring' },
      { id: 'center', d: circle(115), group: 'center' },
    ],
  }
}

function lotus12(): TemplateDef {
  return {
    id: 'lotus12',
    name: '12-petal lotus',
    blurb: 'Two layered petal rings, dense and rich',
    regions: [
      board,
      ...petals(12, 'outerPetal', 250, 445, 0.85),
      ...petals(12, 'innerPetal', 130, 290, 0.8, 0.5),
      { id: 'ring', d: annulus(130, 95), group: 'ring' },
      { id: 'center', d: circle(95), group: 'center' },
    ],
  }
}

function sun(): TemplateDef {
  const rays = ring(16, (a, i) => ({
    id: `ray-${i}`,
    d: polyAt(a, 320, [
      [-52, -100], [0, 130], [52, -100],
    ]),
    group: 'ray',
  }))
  return {
    id: 'sun',
    name: 'Sun with rays',
    blurb: 'Sixteen rays around a glowing core',
    regions: [
      board,
      ...rays,
      { id: 'halo', d: annulus(205, 145), group: 'halo' },
      { id: 'core', d: circle(145), group: 'core' },
    ],
  }
}

function peacock(): TemplateDef {
  const feathers: TemplateRegion[] = []
  const eyes: TemplateRegion[] = []
  const n = 10
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    feathers.push({ id: `feather-${i}`, d: dropletAt(a, 300, 150), group: 'feather' })
    const [ex, ey] = pt(a, 330)
    eyes.push({ id: `eye-${i}`, d: circle(46, ex, ey), group: 'eye' })
  }
  return {
    id: 'peacock',
    name: 'Peacock medallion',
    blurb: 'Feather drops with mirror-ready eyes',
    regions: [
      board,
      ...feathers,
      ...eyes,
      { id: 'ring', d: annulus(160, 110), group: 'ring' },
      { id: 'center', d: circle(110), group: 'center' },
    ],
  }
}

function diamondBand(): TemplateDef {
  const diamonds = ring(16, (a, i) => ({
    id: `diamond-${i}`,
    d: polyAt(a, 330, [
      [0, -72], [46, 0], [0, 72], [-46, 0],
    ]),
    group: 'diamond',
  }))
  return {
    id: 'diamondband',
    name: 'Diamond ring band',
    blurb: 'A band of diamonds circling a plain medallion',
    regions: [
      board,
      { id: 'band', d: annulus(410, 250), group: 'band' },
      ...diamonds,
      { id: 'ring', d: annulus(250, 185), group: 'ring' },
      { id: 'medallion', d: circle(185), group: 'medallion' },
    ],
  }
}

function chakra(): TemplateDef {
  const spokes: TemplateRegion[] = []
  const n = 12
  const gap = 0.16
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + ((i + gap) * 2 * Math.PI) / n
    const a1 = -Math.PI / 2 + ((i + 1 - gap) * 2 * Math.PI) / n
    spokes.push({
      id: `spoke-${i}`,
      d: sector(150, 380, a0, a1),
      group: i % 2 === 0 ? 'spokeA' : 'spokeB',
    })
  }
  return {
    id: 'chakra',
    name: 'Chakra ring',
    blurb: 'Alternating spokes inside a heavy rim',
    regions: [
      board,
      { id: 'rim', d: annulus(445, 395), group: 'rim' },
      ...spokes,
      { id: 'hub', d: circle(105), group: 'hub' },
    ],
  }
}

export const TEMPLATES: TemplateDef[] = [lotus8(), lotus12(), sun(), peacock(), diamondBand(), chakra()]

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}
