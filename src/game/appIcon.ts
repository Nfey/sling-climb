import { Camera } from "./Camera"
import { COLORS } from "./constants"
import { drawBackgroundStyle } from "./backgroundArt"
import { isDarkBackground } from "./backgrounds"
import type { BackgroundStyle, BallStyle, SlingshotStyle } from "./cosmetics"
import {
  drawBallStyle,
  drawSlingshotBands,
  drawSlingshotFork,
  iconSlingshotGeometry,
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
 * Paint the Slinger app icon: equipped (or default) background, slingshot
 * pulled halfway down-left, and ball seated in the pouch.
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

function drawIconSlingAndBall(
  ctx: CanvasRenderingContext2D,
  size: number,
  styles: AppIconStyles,
  time: number,
): void {
  // Bias right so a down-left pull stays inside the maskable safe zone.
  const cx = size * 0.56
  const cy = size * 0.5
  const slingSize = size * 0.5
  const geom = iconSlingshotGeometry(cx, cy, slingSize)
  const rest = geom.rest

  // Halfway stretch, down and to the left (screen space).
  const pullLen = slingSize * 0.42
  const pouch = {
    x: rest.x - pullLen * Math.SQRT1_2,
    y: rest.y + pullLen * Math.SQRT1_2,
  }

  const postWidth = Math.max(3, size * 0.045)
  const forkWidth = Math.max(2.5, size * 0.036)
  const bandWidth = Math.max(2, size * 0.016)

  drawSlingshotFork(ctx, geom, styles.slingshot, time, postWidth, forkWidth)
  drawSlingshotBands(
    ctx,
    geom.left,
    geom.right,
    pouch,
    styles.slingshot,
    time,
    bandWidth,
  )

  const ballRadius = size * 0.11
  ctx.save()
  ctx.translate(pouch.x, pouch.y)
  drawBallStyle(ctx, styles.ball, ballRadius, time)
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
