import { expect, test } from '@playwright/test'

/**
 * Smoke flow per spec: load a template → fill a region → undo → add a
 * 12-mirror radial array → export PNG (non-empty download) → reload
 * (autosave restored).
 */
test('template flow: fill, undo, ring, export, autosave', async ({ page }) => {
  await page.goto('/')

  // dismiss first-run tour if present
  const skip = page.getByText('Skip tour')
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click()

  // switch to Template Mode
  await page.getByRole('button', { name: 'Templates' }).click()
  await expect(page.getByTestId('template-svg')).toBeVisible()

  // need a paint: load a preset palette
  await page.getByTestId('preset-select').selectOption('fevicryl-pastel-6')

  // fill the center region with the fill tool
  await page.getByTestId('tool-fill').click()
  const center = page.getByTestId('region-center')
  const before = await center.getAttribute('fill')
  await center.click({ force: true })
  const after = await center.getAttribute('fill')
  expect(after).not.toBe(before)

  // symmetry: painting one petal paints all petals
  await page.getByTestId('region-petal-0').click({ force: true })
  const p0 = await page.getByTestId('region-petal-0').getAttribute('fill')
  const p4 = await page.getByTestId('region-petal-4').getAttribute('fill')
  expect(p0).toBe(p4)
  expect(p0).not.toBe(before)

  // undo restores the petals
  await page.getByTestId('undo').click()
  expect(await page.getByTestId('region-petal-0').getAttribute('fill')).toBe(before)

  // add a 12-mirror radial array (12 is the default N)
  await page.getByTestId('tab-mirrors').click()
  await page.getByRole('button', { name: /mirrors on a ring/ }).click()
  await expect(page.getByTestId('mirror')).toHaveCount(12)
  await expect(page.getByTestId('mirror-counter')).toContainText('12')

  // export PNG and assert a non-empty download
  await page.getByTestId('export-open').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Artwork PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  const stream = await download.createReadStream()
  let bytes = 0
  for await (const chunk of stream) bytes += (chunk as Buffer).length
  expect(bytes).toBeGreaterThan(5000)
  await page.keyboard.press('Escape')

  // autosave: reload and confirm the fill + mirrors survived
  await page.waitForTimeout(1600) // debounced autosave (~1s)
  await page.reload()
  await expect(page.getByTestId('template-svg')).toBeVisible()
  expect(await page.getByTestId('region-center').getAttribute('fill')).toBe(after)
  await expect(page.getByTestId('mirror')).toHaveCount(12)
})

test('EXIF portrait photo uploads right-side-up; 12MP photo is downscaled', async ({ page }) => {
  await page.goto('/')
  const skip = page.getByText('Skip tour')
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click()

  // build a 12MP landscape JPEG in the browser (4000×3000), then splice in an
  // EXIF APP1 segment with Orientation=6 (rotate 90° CW) — like a phone photo
  const base64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 4000
    c.height = 3000
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#E8DFC8'
    ctx.fillRect(0, 0, 4000, 3000)
    ctx.fillStyle = '#7A5538'
    ctx.fillRect(0, 0, 4000, 300) // dark stripe on the long edge
    return c.toDataURL('image/jpeg', 0.7).split(',')[1]
  })
  const jpeg = Buffer.from(base64, 'base64')
  const exif = Buffer.from([
    0xff, 0xe1, 0x00, 0x22, // APP1, length 34
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF II*, IFD0 @8
    0x01, 0x00, // 1 entry
    0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, // Orientation=6
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ])
  const withExif = Buffer.concat([jpeg.subarray(0, 2), exif, jpeg.subarray(2)])

  await page.getByTestId('photo-input').setInputFiles({
    name: 'portrait.jpg', mimeType: 'image/jpeg', buffer: withExif,
  })

  // oversize toast appears and the crop preview is portrait (EXIF applied)
  await expect(page.getByText(/Large photo scaled down/)).toBeVisible({ timeout: 15000 })
  const canvas = page.getByTestId('crop-canvas')
  await expect(canvas).toBeVisible({ timeout: 15000 })
  const dims = await canvas.evaluate((el) => ({
    w: (el as HTMLCanvasElement).width, h: (el as HTMLCanvasElement).height,
  }))
  expect(dims.h).toBeGreaterThan(dims.w)

  // proceed to the studio — working copy capped at 1800px
  await page.getByRole('button', { name: 'Use this board' }).click()
  await expect(page.getByTestId('photo-plane')).toBeVisible({ timeout: 30000 })
})

test('photo mode: leak guard reverts an unsealed fill and shows the hint', async ({ page }) => {
  await page.goto('/')
  const skip = page.getByText('Skip tour')
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click()
  await page.getByRole('button', { name: 'Try the demo' }).click()
  const plane = page.getByTestId('photo-plane')
  await expect(plane).toBeVisible({ timeout: 30000 })
  await page.waitForTimeout(800)

  const box = await plane.boundingBox()
  const cx = box!.x + box!.width / 2
  const cy = box!.y + box!.height / 2

  // erase a corridor from the center out past the petals — opens every ring
  await page.getByTestId('tool-eraser').click()
  for (let i = 0; i < 4; i++) await page.keyboard.press(']') // bigger brush
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 1; i <= 24; i++) {
    await page.mouse.move(cx, cy - (i / 24) * box!.height * 0.42)
  }
  await page.mouse.up()
  await page.waitForTimeout(400)

  // filling the burst region must trigger the leak guard, not flood the canvas
  await page.getByTestId('tool-fill').click()
  await plane.click({ position: { x: box!.width / 2, y: box!.height / 2 }, force: true })
  await expect(page.getByTestId('leak-hint')).toBeVisible({ timeout: 5000 })
})

test('photo mode: demo board loads and material list opens', async ({ page }) => {
  await page.goto('/')
  const skip = page.getByText('Skip tour')
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click()

  // load the bundled demo (synthetic relief photo)
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await expect(page.getByTestId('photo-plane')).toBeVisible({ timeout: 30000 })
  await expect(page.getByTestId('base-canvas')).toBeVisible()

  // demo palette loaded → fill a petal region near the rim ring
  await page.getByTestId('tool-fill').click()
  const plane = page.getByTestId('photo-plane')
  const box = await plane.boundingBox()
  expect(box).not.toBeNull()
  // tap slightly above center — inside the inner ring region of the demo board
  await plane.click({ position: { x: box!.width / 2, y: box!.height / 2 }, force: true })
  // a painted region should appear in the material list eventually (fills recorded)
  await page.waitForTimeout(800)
  await page.getByTestId('export-open').click()
  await page.getByRole('button', { name: /Material list/ }).click()
  await expect(page.getByTestId('material-sheet')).toBeVisible()
})
