import { describe, expect, it } from 'vitest'
import { rleDecode, rleEncode } from './rle'

describe('RLE mask encode/decode', () => {
  it('round-trips an empty mask', () => {
    const mask = new Uint8Array(100)
    expect(rleDecode(rleEncode(mask), 100)).toEqual(mask)
  })
  it('round-trips a full mask', () => {
    const mask = new Uint8Array(64).fill(255)
    expect(rleDecode(rleEncode(mask), 64)).toEqual(mask)
  })
  it('round-trips a mask that starts set', () => {
    const mask = new Uint8Array([255, 255, 0, 0, 0, 255, 0])
    const runs = rleEncode(mask)
    expect(runs[0]).toBe(0)
    expect(rleDecode(runs, mask.length)).toEqual(mask)
  })
  it('round-trips a pseudo-random large mask', () => {
    const mask = new Uint8Array(600 * 600)
    let s = 12345
    for (let i = 0; i < mask.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      if (s % 17 === 0) mask[i] = 255
    }
    expect(rleDecode(rleEncode(mask), mask.length)).toEqual(mask)
  })
  it('normalizes non-255 truthy values to 255', () => {
    const mask = new Uint8Array([0, 1, 7, 0])
    expect(Array.from(rleDecode(rleEncode(mask), 4))).toEqual([0, 255, 255, 0])
  })
  it('throws on length mismatch', () => {
    expect(() => rleDecode([2, 2], 100)).toThrow()
  })
})
