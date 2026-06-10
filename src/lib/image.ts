/** Image intake helpers: EXIF-aware decode, downscale, rotate. */

export async function fileToCanvas(file: File | Blob): Promise<HTMLCanvasElement> {
  let source: ImageBitmap | HTMLImageElement
  try {
    // createImageBitmap applies EXIF orientation — the classic portrait-photo fix
    source = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    source = await blobToImage(file)
  }
  const c = document.createElement('canvas')
  c.width = source.width
  c.height = source.height
  c.getContext('2d')!.drawImage(source, 0, 0)
  if ('close' in source) source.close()
  return c
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')) }
    img.src = url
  })
}

export function downscale(src: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  const longest = Math.max(src.width, src.height)
  if (longest <= maxEdge) return src
  const k = maxEdge / longest
  const c = document.createElement('canvas')
  c.width = Math.round(src.width * k)
  c.height = Math.round(src.height * k)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, c.width, c.height)
  return c
}

export function rotate90(src: HTMLCanvasElement, clockwise: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = src.height
  c.height = src.width
  const ctx = c.getContext('2d')!
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate(((clockwise ? 90 : -90) * Math.PI) / 180)
  ctx.drawImage(src, -src.width / 2, -src.height / 2)
  return c
}

export function dataUrlToCanvas(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d')!.drawImage(img, 0, 0)
      resolve(c)
    }
    img.onerror = () => reject(new Error('decode failed'))
    img.src = url
  })
}

export function canvasImageData(c: HTMLCanvasElement): ImageData {
  return c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height)
}

export function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

export function isSupportedImage(file: File): boolean {
  return /^image\/(jpeg|png|webp)$/i.test(file.type)
}
