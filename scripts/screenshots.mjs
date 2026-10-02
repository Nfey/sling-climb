/**
 * Stage-1 art screenshots at 390×844, deviceScaleFactor 2.
 *
 *   npm run build
 *   npx vite preview --port 4173 --host 127.0.0.1
 *   node scripts/screenshots.mjs
 *
 * Writes docs/screenshots/art-v1-stage1/*.png
 * Override the server with SCREENSHOT_URL.
 */
import { chromium } from "playwright"
import { mkdir } from "node:fs/promises"
import path from "node:path"

const base = process.env.SCREENSHOT_URL ?? "http://127.0.0.1:4173"
const out = path.resolve("docs/screenshots/art-v1-stage1")
await mkdir(out, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})

async function shot(name, search) {
  const page = await context.newPage()
  const url = search ? `${base}/${search}` : `${base}/`
  await page.goto(url, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(
    () => document.documentElement.dataset.artReady === "1",
    null,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(out, name) })
  await page.close()
  console.log("wrote", name)
}

await shot("01-title.png", "")
await shot("02-mid-climb.png", "?debug=1&climb=400")
await shot("03-kill-line.png", "?debug=1")
await shot("04-best-milestone.png", "?debug=1&best=220")
await shot("05-fallback-art0.png", "?art=0")

await browser.close()
