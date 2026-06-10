import type { Swatch } from '../types'

let counter = 0
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 0xffff
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

function sw(name: string, hex: string): Swatch {
  return { id: uid('sw'), name, hex }
}

export interface PalettePreset { id: string; name: string; blurb: string; swatches: () => Swatch[] }

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'fevicryl-pastel-6',
    name: 'Fevicryl pastel 6',
    blurb: 'The starter jar set — approximate, tune by eye',
    swatches: () => [
      sw('Mint', '#BFD8D2'),
      sw('Pastel pink', '#F4B8C1'),
      sw('Pistachio', '#DCE6A0'),
      sw('Bottle green', '#2E6B3E'),
      sw('Golden yellow', '#F2C744'),
      sw('Lilac', '#C9C3E3'),
    ],
  },
  {
    id: 'kutch',
    name: 'Traditional Kutch',
    blurb: 'Bone whites and mirror on mud brown',
    swatches: () => [
      sw('Bone white', '#F3EBDD'),
      sw('Raw clay', '#C9A77C'),
      sw('Mud brown', '#7A5538'),
      sw('Deep umber', '#4A3322'),
      sw('Turmeric', '#D9A441'),
      sw('Iron red', '#9C4A2F'),
    ],
  },
  {
    id: 'jewel',
    name: 'Jewel tones',
    blurb: 'Deep saturated festival colors',
    swatches: () => [
      sw('Ruby', '#8E1F3F'),
      sw('Emerald', '#1F6E50'),
      sw('Sapphire night', '#23496B'),
      sw('Amethyst', '#5E3A6E'),
      sw('Amber', '#C97E1E'),
      sw('Ivory', '#F4ECDC'),
    ],
  },
  {
    id: 'mono-clay',
    name: 'Monochrome clay',
    blurb: 'One material, five depths',
    swatches: () => [
      sw('Whitewash', '#F6F1E6'),
      sw('Sand', '#E2D3B6'),
      sw('Adobe', '#C3A47D'),
      sw('Terracotta', '#A0744A'),
      sw('Burnt clay', '#6E4A2E'),
    ],
  },
]

export const RIDGE_FINISHES: { id: string; name: string; hex: string; metallic: boolean }[] = [
  { id: 'white', name: 'White', hex: '#F4EFE4', metallic: false },
  { id: 'bone', name: 'Bone', hex: '#E5D9BF', metallic: false },
  { id: 'gold', name: 'Gold', hex: '#C19A3D', metallic: true },
  { id: 'copper', name: 'Copper', hex: '#B0613A', metallic: true },
  { id: 'silver', name: 'Silver', hex: '#B9BDC0', metallic: true },
]
