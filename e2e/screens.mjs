// Visual QA helper: screenshots key states and reports console errors.
import { chromium } from '@playwright/test'

const base = 'http://localhost:5179'
const out = 'test-results/screens'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1366, height: 860 } })
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`${msg.type()}: ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))

await page.goto(base)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}/01-welcome.png` })

const skip = page.getByText('Skip tour')
if (await skip.isVisible().catch(() => false)) await skip.click()

// template mode
await page.getByRole('button', { name: 'Templates' }).click()
await page.waitForTimeout(400)
await page.getByTestId('preset-select').selectOption('fevicryl-pastel-6')
await page.getByTestId('tool-fill').click()
await page.getByTestId('region-petal-0').click({ force: true })
await page.locator('[data-testid="swatch-grid"] button').nth(3).click()
await page.getByTestId('region-center').click({ force: true })
await page.locator('[data-testid="swatch-grid"] button').nth(4).click()
await page.getByTestId('region-ring').click({ force: true })
await page.getByTestId('ridge-gold').click()
await page.getByTestId('tab-mirrors').click()
await page.getByRole('button', { name: /mirrors on a ring/ }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${out}/02-template.png` })

// wall preview
await page.getByTestId('tab-variants').click()
await page.getByRole('button', { name: 'Wall preview' }).click()
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/03-wall.png` })
await page.keyboard.press('Escape')

// photo demo
await page.getByRole('button', { name: 'My photo' }).click()
await page.getByRole('button', { name: 'Try the demo' }).click()
await page.waitForSelector('[data-testid="photo-plane"]', { timeout: 30000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}/04-photo-overlay.png` })

// paint some regions
await page.getByTestId('tool-fill').click()
const plane = page.getByTestId('photo-plane')
const box = await plane.boundingBox()
await plane.click({ position: { x: box.width / 2, y: box.height / 2 }, force: true })
await page.waitForTimeout(300)
await plane.click({ position: { x: box.width / 2, y: box.height / 2 - 100 }, force: true })
await page.waitForTimeout(300)
await plane.click({ position: { x: box.width / 2 + 130, y: box.height / 2 - 60 }, force: true })
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/05-photo-painted.png` })

// material list
await page.getByTestId('export-open').click()
await page.getByRole('button', { name: /Material list/ }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/06-material.png` })
await page.keyboard.press('Escape')

// mobile viewport
await page.setViewportSize({ width: 390, height: 760 })
await page.waitForTimeout(600)
await page.screenshot({ path: `${out}/07-mobile.png` })

console.log(errors.length ? `CONSOLE ISSUES:\n${errors.join('\n')}` : 'No console errors or warnings.')
await browser.close()
