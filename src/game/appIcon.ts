import { Camera } from "./Camera"
import { COLORS } from "./constants"
import { drawBackgroundStyle } from "./backgroundArt"
import { isDarkBackground } from "./backgrounds"
import type { BackgroundStyle, BallStyle, SlingshotStyle } from "./cosmetics"
import {
  drawBallStyle,
  drawSlingshotBands,
  drawSlingshotFork,
  type SlingshotGeom,
} from "./cosmeticArt"

export interface AppIconStyles {
  slingshot: SlingshotStyle
  ball: BallStyle
  background: BackgroundStyle
}

/** Default equipped look used for static PWA icons and first paint. */
export const DEFAULT_APP_ICON_STYLES: AppIconStyles = {
  slingshot: "classic",
  ball: "classic",
  background: "classic",
}

/**
 * Paint the Slinger app icon: upright symmetric slingshot aiming top-right
 * with trajectory dots, using equipped (or default) cosmetics.
 */
export function renderAppIcon(
  size: number,
  styles: AppIconStyles = DEFAULT_APP_ICON_STYLES,
  time = 0,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D not available")

  drawIconBackground(ctx, size, styles.background, time)
  drawIconSlingAndBall(ctx, size, styles, time)
  return canvas
}

/** Apply PNG data-URL icons to the document (tab favicon + Apple touch). */
export function applyDocumentAppIcon(styles: AppIconStyles, time = 0): void {
  const icon = renderAppIcon(192, styles, time)
  const apple = renderAppIcon(180, styles, time)
  setIconLink("icon", icon.toDataURL("image/png"), "image/png")
  setIconLink("apple-touch-icon", apple.toDataURL("image/png"))

  const theme = document.querySelector('meta[name="theme-color"]')
  if (theme) {
    theme.setAttribute(
      "content",
      isDarkBackground(styles.background) ? "#0f172a" : "#ffffff",
    )
  }
}

/** Export PNG blobs for the standard PWA icon sizes (default cosmetics). */
export async function exportDefaultAppIconPngs(): Promise<Record<string, Blob>> {
  const sizes: Record<string, number> = {
    "icon-192.png": 192,
    "icon-512.png": 512,
    "icon-maskable-512.png": 512,
    "apple-touch-icon.png": 180,
  }
  const out: Record<string, Blob> = {}
  for (const [name, size] of Object.entries(sizes)) {
    const canvas = renderAppIcon(size, DEFAULT_APP_ICON_STYLES, 0)
    out[name] = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error(`toBlob failed for ${name}`))),
        "image/png",
      )
    })
  }
  return out
}

function drawIconBackground(
  ctx: CanvasRenderingContext2D,
  size: number,
  style: BackgroundStyle,
  time: number,
): void {
  if (style === "classic") {
    ctx.fillStyle = COLORS.skyMid
    ctx.fillRect(0, 0, size, size)
    ctx.save()
    ctx.globalAlpha = 0.04
    ctx.strokeStyle = COLORS.ink
    ctx.lineWidth = Math.max(1, size / 256)
    const step = size * 0.055
    const offset = (time * 12) % step
    for (let y = -step; y < size + step; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y + offset)
      ctx.lineTo(size, y + offset + step * 0.28)
      ctx.stroke()
    }
    ctx.restore()
    return
  }

  const cam = new Camera()
  cam.resize(size, size, 1)
  drawBackgroundStyle(ctx, cam, style, time, size)
}

/** Flat upright Y: long handle, equal short wings (no perspective warp). */
function uprightSlingGeom(cx: number, cy: number, size: number): SlingshotGeom {
  const handle = size * 0.48
  const wingH = size * 0.15
  const wingW = size * 0.26
  return {
    base: { x: cx, y: cy + handle },
    rest: { x: cx, y: cy },
    left: { x: cx - wingW, y: cy - wingH },
    right: { x: cx + wingW, y: cy - wingH },
  }
}

function drawIconSlingAndBall(
  ctx: CanvasRenderingContext2D,
  size: number,
  styles: AppIconStyles,
  time: number,
): void {
  const cx = size * 0.45
  const cy = size * 0.48
  const slingSize = size * 0.56
  const geom = uprightSlingGeom(cx, cy, slingSize)

  // Pull mostly down, slightly left — aims top-right without bands slashing the handle.
  const pullLen = slingSize * 0.28
  const pouch = {
    x: geom.rest.x - pullLen * 0.4,
    y: geom.rest.y + pullLen * 0.92,
  }

  drawAimTrajectory(ctx, geom.rest, pouch, size)

  const postWidth = Math.max(5, size * 0.058)
  const forkWidth = Math.max(4, size * 0.044)
  const bandWidth = Math.max(2, size * 0.015)

  drawSlingshotBands(
    ctx,
    geom.left,
    geom.right,
    pouch,
    styles.slingshot,
    time,
    bandWidth,
  )
  drawSlingshotFork(ctx, geom, styles.slingshot, time, postWidth, forkWidth)

  const ballRadius = size * 0.095
  ctx.save()
  ctx.translate(pouch.x, pouch.y)
  drawBallStyle(ctx, styles.ball, ballRadius, time)
  ctx.restore()
}

/** Dotted trajectory arc toward the top-right (matches in-game aim indicator). */
function drawAimTrajectory(
  ctx: CanvasRenderingContext2D,
  rest: { x: number; y: number },
  pouch: { x: number; y: number },
  size: number,
): void {
  const pdx = rest.x - pouch.x
  const pdy = rest.y - pouch.y
  const plen = Math.hypot(pdx, pdy) || 1
  const dirX = pdx / plen
  const dirY = pdy / plen

  let x = rest.x + dirX * size * 0.12
  let y = rest.y + dirY * size * 0.12
  const speed = size * 0.68
  let vx = dirX * speed
  let vy = dirY * speed
  const dt = 1 / 32
  const g = size * 1.55

  ctx.save()
  // Slightly lighter than the fork so dots don't read as a longer wing.
  ctx.fillStyle = "rgba(47, 111, 237, 0.55)"
  for (let i = 0; i < 14; i++) {
    vy += g * dt
    x += vx * dt
    y += vy * dt
    if (x < size * 0.06 || x > size * 0.94 || y < size * 0.06 || y > size * 0.88) break
    const r = Math.max(size * 0.009, size * 0.02 - i * size * 0.00085)
    ctx.globalAlpha = Math.max(0.2, 0.85 - i * 0.05)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function setIconLink(rel: string, href: string, type?: string): void {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement("link")
    link.rel = rel
    document.head.appendChild(link)
  }
  if (type) link.type = type
  else link.removeAttribute("type")
  link.href = href
}
