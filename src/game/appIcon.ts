import { Camera } from "./Camera"
import { COLORS } from "./constants"
import { drawBackgroundStyle } from "./backgroundArt"
import { isDarkBackground } from "./backgrounds"
import type { BackgroundStyle, BallStyle, SlingshotStyle } from "./cosmetics"
import {
  drawBallStyle,
  drawSlingshotFork,
  rainbowBandColor,
  slingshotAccentColor,
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
 * Paint the Slinger app icon: upright slingshot aiming top-right with
 * trajectory dots, using equipped (or default) cosmetics.
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

interface Pt3 {
  x: number
  y: number
  z: number
}

interface Pt2 {
  x: number
  y: number
  s: number
}

/** Upright sling: long handle, short wings, mild depth for a 3D read. */
function iconSlingModel(unit: number): {
  base: Pt3
  rest: Pt3
  left: Pt3
  right: Pt3
} {
  const handleLen = unit * 1.5
  const wingLen = unit * 0.38
  const wingSpread = unit * 0.56
  return {
    base: { x: 0, y: handleLen, z: 0 },
    rest: { x: 0, y: 0, z: 0 },
    left: { x: -wingSpread, y: -wingLen, z: unit * 0.22 },
    right: { x: wingSpread, y: -wingLen, z: -unit * 0.22 },
  }
}

function yawPt(p: Pt3, angle: number): Pt3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return {
    x: p.x * c + p.z * s,
    y: p.y,
    z: -p.x * s + p.z * c,
  }
}

function projectPt(p: Pt3, cx: number, cy: number, focal: number): Pt2 {
  const s = focal / (focal + p.z)
  return {
    x: cx + p.x * s,
    y: cy + p.y * s,
    s,
  }
}

function drawIconSlingAndBall(
  ctx: CanvasRenderingContext2D,
  size: number,
  styles: AppIconStyles,
  time: number,
): void {
  // Bias slightly left/down so the top-right aim arc has room.
  const cx = size * 0.46
  const cy = size * 0.52
  const unit = size * 0.26
  const model = iconSlingModel(unit)

  // Mild yaw only — keep the sling upright (handle vertical).
  const yaw = 0.28
  const focal = unit * 3.4
  const map = (p: Pt3): Pt2 => projectPt(yawPt(p, yaw), cx, cy, focal)

  const base = map(model.base)
  const rest = map(model.rest)
  const left = map(model.left)
  const right = map(model.right)

  // Aim top-right ⇒ pull pouch halfway down-left.
  const pullLen = unit * 0.72
  const pouch: Pt2 = {
    x: rest.x - pullLen * Math.SQRT1_2,
    y: rest.y + pullLen * Math.SQRT1_2,
    s: (left.s + right.s) * 0.5,
  }

  // Soft contact shadow.
  ctx.save()
  ctx.fillStyle = "rgba(17, 17, 17, 0.1)"
  ctx.beginPath()
  ctx.ellipse(base.x + size * 0.01, base.y + size * 0.012, size * 0.1, size * 0.03, 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Trajectory aim indicator (launch opposite the pull → top-right).
  drawAimTrajectory(ctx, rest, pouch, size)

  const accent = slingshotAccentColor(styles.slingshot, time)
  const handleW = Math.max(4, size * 0.055)
  const wingW = Math.max(3, size * 0.04)

  drawTubeSegment(ctx, rest, right, wingW * right.s, shade(accent, -0.12), shade(accent, -0.28))
  drawTubeSegment(
    ctx,
    base,
    rest,
    handleW * ((base.s + rest.s) * 0.5),
    shade(accent, 0.08),
    shade(accent, -0.1),
  )
  drawTubeSegment(ctx, rest, left, wingW * left.s, shade(accent, 0.14), shade(accent, -0.04))

  if (styles.slingshot !== "classic") {
    const geom: SlingshotGeom = {
      base: { x: base.x, y: base.y },
      rest: { x: rest.x, y: rest.y },
      left: { x: left.x, y: left.y },
      right: { x: right.x, y: right.y },
    }
    ctx.save()
    ctx.globalAlpha = styles.slingshot === "twig" || styles.slingshot === "rainbow" ? 0.95 : 0.55
    drawSlingshotFork(ctx, geom, styles.slingshot, time, handleW * 0.85, wingW * 0.85)
    ctx.restore()
  }

  const bandWidth = Math.max(2.5, size * 0.022)
  drawAimBand(ctx, left, pouch, bandColor(styles.slingshot, time, 0), bandWidth * left.s)
  drawAimBand(ctx, right, pouch, bandColor(styles.slingshot, time, 30), bandWidth * right.s)

  const ballRadius = size * 0.1 * pouch.s
  ctx.save()
  ctx.translate(pouch.x, pouch.y)
  drawBallStyle(ctx, styles.ball, ballRadius, time)
  ctx.restore()
}

/** Dotted trajectory arc toward the top-right (matches in-game aim indicator). */
function drawAimTrajectory(
  ctx: CanvasRenderingContext2D,
  rest: Pt2,
  pouch: Pt2,
  size: number,
): void {
  // Start just ahead of the fork in the launch direction (opposite pull).
  const pdx = rest.x - pouch.x
  const pdy = rest.y - pouch.y
  const plen = Math.hypot(pdx, pdy) || 1
  const dirX = pdx / plen
  const dirY = pdy / plen

  let x = rest.x + dirX * size * 0.04
  let y = rest.y + dirY * size * 0.04
  const speed = size * 0.72
  let vx = dirX * speed
  let vy = dirY * speed
  const dt = 1 / 32
  const g = size * 1.55

  ctx.save()
  ctx.fillStyle = COLORS.trajectory
  for (let i = 0; i < 16; i++) {
    vy += g * dt
    x += vx * dt
    y += vy * dt
    if (x < size * 0.06 || x > size * 0.94 || y < size * 0.06 || y > size * 0.88) break
    const r = Math.max(size * 0.01, size * 0.022 - i * size * 0.0008)
    ctx.globalAlpha = Math.max(0.22, 0.92 - i * 0.048)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Pulled band from fork tip to pouch (gentle curve, not slack). */
function drawAimBand(
  ctx: CanvasRenderingContext2D,
  from: Pt2,
  to: Pt2,
  color: string,
  width: number,
): void {
  const mx = (from.x + to.x) * 0.5
  const my = (from.y + to.y) * 0.5 + Math.abs(to.x - from.x) * 0.08
  ctx.save()
  ctx.lineCap = "round"
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.quadraticCurveTo(mx, my, to.x, to.y)
  ctx.stroke()
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)"
  ctx.lineWidth = Math.max(1, width * 0.28)
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.quadraticCurveTo(mx, my - 1, to.x, to.y)
  ctx.stroke()
  ctx.restore()
}

function drawTubeSegment(
  ctx: CanvasRenderingContext2D,
  a: Pt2,
  b: Pt2,
  width: number,
  light: string,
  dark: string,
): void {
  ctx.save()
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  ctx.strokeStyle = dark
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()

  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ox = (-dy / len) * width * 0.18
  const oy = (dx / len) * width * 0.18
  ctx.strokeStyle = light
  ctx.lineWidth = width * 0.55
  ctx.beginPath()
  ctx.moveTo(a.x + ox, a.y + oy)
  ctx.lineTo(b.x + ox, b.y + oy)
  ctx.stroke()
  ctx.restore()
}

function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1]!, 16)
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c + amount * 255)))
  const r = adj((n >> 16) & 0xff)
  const g = adj((n >> 8) & 0xff)
  const b = adj(n & 0xff)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function bandColor(style: SlingshotStyle, time: number, offset: number): string {
  switch (style) {
    case "classic":
      return "#1d4fbf"
    case "twig":
      return "#a16207"
    case "iron":
      return "#475569"
    case "vine":
      return "#22c55e"
    case "royal":
      return "#fbbf24"
    case "crimson":
      return "#ef4444"
    case "golden":
      return "#b45309"
    case "rainbow":
      return rainbowBandColor(time, offset)
    default:
      return slingshotAccentColor(style, time)
  }
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
