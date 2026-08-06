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
 * Paint the Slinger app icon: equipped (or default) background, a 3D-tilted
 * slingshot with a long handle and slack wavy bands, and ball in the pouch.
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
  /** Perspective scale at this point (1 = focal plane). */
  s: number
}

/** Local sling model: longer handle than wings, pouch resting with slack. */
function iconSlingModel(unit: number): {
  base: Pt3
  rest: Pt3
  left: Pt3
  right: Pt3
  pouch: Pt3
} {
  // Handle clearly longer than each wing (~2×).
  const handleLen = unit * 1.55
  const wingLen = unit * 0.36
  const wingSpread = unit * 0.55
  return {
    base: { x: 0, y: handleLen, z: 0 },
    rest: { x: 0, y: 0, z: 0 },
    // Depth baked for -45° yaw: right tip nearer, left tip farther.
    left: { x: -wingSpread * 1.15, y: -wingLen * 0.9, z: -unit * 0.5 },
    right: { x: wingSpread * 0.9, y: -wingLen, z: unit * 0.4 },
    // Soft pouch hangs on-axis below the crotch — bands stay slack.
    pouch: { x: 0, y: unit * 0.42, z: unit * 0.12 },
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

function pitchPt(p: Pt3, angle: number): Pt3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return {
    x: p.x,
    y: p.y * c - p.z * s,
    z: p.y * s + p.z * c,
  }
}

function projectPt(
  p: Pt3,
  cx: number,
  cy: number,
  scale: number,
  focal: number,
): Pt2 {
  const s = focal / (focal + p.z)
  return {
    x: cx + p.x * scale * s,
    y: cy + p.y * scale * s,
    s,
  }
}

/** Rotate a projected point around the icon center (canvas angle, y-down). */
function rotate2d(p: Pt2, angle: number, cx: number, cy: number): Pt2 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const dx = p.x
  const dy = p.y
  return {
    x: cx + dx * c - dy * s,
    y: cy + dx * s + dy * c,
    s: p.s,
  }
}

function drawIconSlingAndBall(
  ctx: CanvasRenderingContext2D,
  size: number,
  styles: AppIconStyles,
  time: number,
): void {
  const cx = size * 0.5
  const cy = size * 0.46
  const unit = size * 0.24
  const model = iconSlingModel(unit)

  // -45° 3D yaw; +45° screen rotation aims the fork at the top-right corner.
  const yaw = -Math.PI / 4
  const pitch = -0.14
  const face = Math.PI / 4
  const focal = unit * 2.6

  const mapRaw = (p: Pt3): Pt2 =>
    projectPt(pitchPt(yawPt(p, yaw), pitch), 0, 0, 1, focal)

  const map = (p: Pt3): Pt2 => rotate2d(mapRaw(p), face, cx, cy)

  const base = map(model.base)
  const rest = map(model.rest)
  const left = map(model.left)
  const right = map(model.right)
  const pouch = map(model.pouch)

  // Soft ground contact shadow under the handle tip.
  ctx.save()
  ctx.fillStyle = "rgba(17, 17, 17, 0.1)"
  ctx.beginPath()
  ctx.ellipse(
    base.x - size * 0.02,
    base.y + size * 0.015,
    size * 0.11,
    size * 0.032,
    -0.25,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  ctx.restore()

  const accent = slingshotAccentColor(styles.slingshot, time)
  const handleW = Math.max(4, size * 0.055)
  const wingW = Math.max(3, size * 0.04)

  // Far wing first, then handle, then near wing (painter's algorithm).
  const far = left.s <= right.s ? left : right
  const near = left.s > right.s ? left : right
  drawTubeSegment(ctx, rest, far, wingW * far.s, shade(accent, -0.18), shade(accent, -0.32))
  drawTubeSegment(ctx, base, rest, handleW * ((base.s + rest.s) * 0.5), shade(accent, 0.06), shade(accent, -0.12))
  drawTubeSegment(ctx, rest, near, wingW * near.s, shade(accent, 0.14), shade(accent, -0.05))

  // Keep special style flourishes on top of the 3D tubes.
  if (styles.slingshot !== "classic") {
    const geom: SlingshotGeom = {
      base: { x: base.x, y: base.y },
      rest: { x: rest.x, y: rest.y },
      left: { x: left.x, y: left.y },
      right: { x: right.x, y: right.y },
    }
    ctx.save()
    ctx.globalAlpha = styles.slingshot === "twig" || styles.slingshot === "rainbow" ? 0.95 : 0.55
    drawSlingshotFork(
      ctx,
      geom,
      styles.slingshot,
      time,
      handleW * 0.85,
      wingW * 0.85,
    )
    ctx.restore()
  }

  const bandWidth = Math.max(2.5, size * 0.024)
  drawSlackBand(
    ctx,
    left,
    pouch,
    bandColor(styles.slingshot, time, 0),
    bandWidth * left.s,
    size * 0.1,
    1,
  )
  drawSlackBand(
    ctx,
    right,
    pouch,
    bandColor(styles.slingshot, time, 30),
    bandWidth * Math.max(0.75, right.s),
    size * 0.12,
    -1,
  )

  const ballRadius = size * 0.1 * pouch.s
  ctx.save()
  ctx.translate(pouch.x, pouch.y)
  drawBallStyle(ctx, styles.ball, ballRadius, time)
  ctx.restore()
}

/** Rounded tube stroke with a light/dark edge to sell cylindrical depth. */
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

  // Offset highlight along the near (leftish) side of the segment.
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
  const adj = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + amount * 255)))
  const r = adj((n >> 16) & 0xff)
  const g = adj((n >> 8) & 0xff)
  const b = adj(n & 0xff)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** Slack rubber band: sagging bezier with a stylized wave (not pulled taut). */
function drawSlackBand(
  ctx: CanvasRenderingContext2D,
  from: Pt2,
  to: Pt2,
  color: string,
  width: number,
  wave: number,
  side: number,
): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const px = (-dy / len) * side
  const py = (dx / len) * side

  // Extra slack: droop well below the chord with an S-wave.
  const sag = Math.max(Math.abs(wave) * 1.6, len * 0.28)
  const c1x = from.x + dx * 0.22 + px * wave * 1.35
  const c1y = from.y + dy * 0.12 + py * wave * 0.2 + sag * 0.95
  const c2x = from.x + dx * 0.62 - px * wave * 1.05
  const c2y = from.y + dy * 0.55 + sag * 1.45

  ctx.save()
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, to.x, to.y)
  ctx.stroke()

  // Thin highlight for a rubbery look.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
  ctx.lineWidth = Math.max(1, width * 0.3)
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.bezierCurveTo(c1x, c1y - 1.5, c2x, c2y - 1.5, to.x, to.y)
  ctx.stroke()
  ctx.restore()
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
