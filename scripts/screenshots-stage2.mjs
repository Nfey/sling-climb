/**
 * Stage-2 screenshots.
 *
 * Phone: 390×844, deviceScaleFactor 2, mobile + touch.
 * Desktop: 1280×800, deviceScaleFactor 1, so the letterbox wall bodies show.
 *
 *   npm run build
 *   npx vite preview --port 4173 --host 127.0.0.1
 *   node scripts/screenshots-stage2.mjs
 */
import { chromium } from "playwright"
import { mkdir } from "node:fs/promises"
import path from "node:path"

const base = process.env.SCREENSHOT_URL ?? "http://127.0.0.1:4173"
const out = path.resolve("docs/screenshots/art-v1-stage2")
await mkdir(out, { recursive: true })

const browser = await chromium.launch()

async function shot(context, name, search) {
  const page = await context.newPage()
  const url = search ? `${base}/${search}` : `${base}/`
  await page.goto(url, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(
    () => document.documentElement.dataset.artReady === "1",
    null,
    { timeout: 20000 },
  )
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(out, name) })
  await page.close()
  console.log("wrote", name)
}

const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
await shot(phone, "01-title.png", "")

async function menuShot(name, x, y) {
  const page = await phone.newPage()
  await page.goto(base + "/", { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(
    () => document.documentElement.dataset.artReady === "1",
    null,
    { timeout: 20000 },
  )
  await page.waitForTimeout(700)
  await page.mouse.click(x, y)
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(out, name) })
  await page.close()
  console.log("wrote", name)
}

// Title layout at 390×844: Daily / Hats / Trails row, centers measured on the title shot.
await menuShot("05-hats.png", 195, 478)
await menuShot("06-trails.png", 299, 478)

await shot(phone, "02-low-canyon.png", "?debug=1&climb=400")
await shot(phone, "03-storm-front.png", "?debug=1&climb=12000")
await phone.close()

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
})
await shot(desktop, "04-desktop-letterbox.png", "?debug=1&climb=400")
await desktop.close()

await browser.close()
