/**
 * Run-length encoding for binary masks (0 / 255).
 * Format: run lengths alternating zero-runs and set-runs, starting with a zero-run
 * (which may be 0 if the mask starts set).
 */
export function rleEncode(mask: Uint8Array): number[] {
  const runs: number[] = []
  let current = 0 // start expecting zeros
  let run = 0
  for (let i = 0; i < mask.length; i++) {
    const v = mask[i] ? 1 : 0
    if (v === current) {
      run++
    } else {
      runs.push(run)
      current = v
      run = 1
    }
  }
  runs.push(run)
  return runs
}

export function rleDecode(runs: number[], length: number): Uint8Array {
  const mask = new Uint8Array(length)
  let pos = 0
  let value = 0
  for (const run of runs) {
    if (value) mask.fill(255, pos, pos + run)
    pos += run
    value = value ? 0 : 1
  }
  if (pos !== length) throw new Error(`RLE length mismatch: got ${pos}, expected ${length}`)
  return mask
}
