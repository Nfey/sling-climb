import { slingBand } from "./art/cosmeticsData"
import type { BallStyle, SlingshotStyle } from "./cosmetics"

export type BallDrawPhase = "lighting" | "pattern" | "all"

/** Draw a ball variant centered at (0,0) with given radius. */
export function drawBallStyle(
  ctx: CanvasRenderingContext2D,
  style: BallStyle,
  radius: number,
  time: number,
  phase: BallDrawPhase = "all",
): void {
  switch (style) {
    case "classic":
      if (phase !== "pattern") drawClassicBall(ctx, radius, "#fff6dd", "#f0d9a0", "#d4b06a")
      break
    case "tangerine":
      if (phase !== "pattern") drawClassicBall(ctx, radius, "#ffd0a8", "#f28a3a", "#c45a16")
      break
    case "soccer":
      drawSoccerBall(ctx, radius, phase)
      break
    case "baseball":
      drawBaseball(ctx, radius, phase)
      break
    case "tennis":
      drawTennisBall(ctx, radius, phase)
      break
    case "basketball":
      drawBasketball(ctx, radius, phase)
      break
    case "beach":
      drawBeachBall(ctx, radius, phase)
      break
    case "volleyball":
      drawVolleyballBall(ctx, radius, phase)
      break
    case "bowling":
      drawBowlingBall(ctx, radius, phase)
      break
    case "cactus":
      if (phase !== "pattern") drawClassicBall(ctx, radius, "#b7e3a8", "#4FAE5A", "#2f7a38")
      break
    case "tumbleweed":
      if (phase !== "pattern") drawClassicBall(ctx, radius, "#e6d2a8", "#c4a574", "#8A6A4A")
      break
    case "turquoise":
      if (phase !== "pattern") drawClassicBall(ctx, radius, "#d5fff8", "#44C0B0", "#1d7a70")
      break
    case "geode":
      if (phase !== "pattern") drawClassicBall(ctx, radius, "#f3e6d4", "#b29776", "#6b5344")
      break
    case "moon":
      if (phase !== "pattern") drawClassicBall(ctx, radius, "#ffffff", "#f4f0e6", "#c9c2b2")
      break
    case "glider":
      if (phase !== "pattern") drawClassicBall(ctx, radius, "#fff4d2", "#f0c14a", "#b8860b")
      break
    case "meteor":
      if (phase !== "pattern") drawClassicBall(ctx, radius, "#d7c4ae", "#805A3B", "#3d2a1c")
      break
  }
  void time
}

function drawClassicBall(
  ctx: CanvasRenderingContext2D,
  radius: number,
  highlight: string,
  fill: string,
  stroke: string,
): void {
  const grd = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, 1, 0, 0, radius)
  grd.addColorStop(0, highlight)
  grd.addColorStop(0.55, fill)
  grd.addColorStop(1, stroke)
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "rgba(90, 60, 30, 0.25)"
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawSoccerPentagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pentR: number,
  rotation: number,
): void {
  ctx.beginPath()
  for (let v = 0; v < 5; v++) {
    const va = rotation + (v * 2 * Math.PI) / 5
    const x = cx + Math.cos(va) * pentR
    const y = cy + Math.sin(va) * pentR
    if (v === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

function drawSoccerBall(ctx: CanvasRenderingContext2D, radius: number, phase: BallDrawPhase): void {
  if (phase !== "pattern") {
    drawClassicBall(ctx, radius, "#ffffff", "#f8fafc", "#cbd5e1")
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.strokeStyle = "#374151"
    ctx.lineWidth = Math.max(2, radius * 0.12)
    ctx.stroke()
  }
  if (phase !== "lighting") {
    ctx.fillStyle = "#111827"
    const pentR = radius * 0.22
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(a) * radius * 0.42
      const py = Math.sin(a) * radius * 0.42
      drawSoccerPentagon(ctx, px, py, pentR, a)
    }
  }
}

function drawBaseball(ctx: CanvasRenderingContext2D, radius: number, phase: BallDrawPhase): void {
  const r = radius

  if (phase !== "pattern") {
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = "rgba(100, 116, 139, 0.32)"
    ctx.beginPath()
    ctx.arc(-r * 0.12, r * 0.18, r * 0.88, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  if (phase !== "lighting") {
    ctx.strokeStyle = "#111827"
    ctx.lineWidth = Math.max(2, r * 0.11)
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()

    drawBaseballSeam(ctx, r, -r, -r, r, Math.PI / 2, 0, true)
    drawBaseballSeam(ctx, r, r, r, r, Math.PI, -Math.PI / 2, false)
  }
}

function drawBaseballSeam(
  ctx: CanvasRenderingContext2D,
  ballR: number,
  cx: number,
  cy: number,
  sr: number,
  a0: number,
  a1: number,
  ccw: boolean,
): void {
  const stitchCount = Math.max(10, Math.round(ballR * 0.38))

  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, ballR * 0.99, 0, Math.PI * 2)
  ctx.clip()

  // Leather dimples on the convex (outer) side of the seam
  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)"
  ctx.lineWidth = Math.max(1.2, ballR * 0.05)
  ctx.lineCap = "round"
  for (let i = 0; i <= stitchCount; i++) {
    const t = i / stitchCount
    const a = seamArcAngle(a0, a1, t, ccw)
    const px = cx + sr * Math.cos(a)
    const py = cy + sr * Math.sin(a)
    const dist = Math.hypot(px, py) || 1
    const ox = px + (px / dist) * ballR * 0.055
    const oy = py + (py / dist) * ballR * 0.055
    const tangent = a + (ccw ? Math.PI / 2 : -Math.PI / 2)
    ctx.beginPath()
    ctx.arc(ox, oy, ballR * 0.045, tangent - 0.55, tangent + 0.55)
    ctx.stroke()
  }

  // Dark thread spine
  ctx.strokeStyle = "#475569"
  ctx.lineWidth = Math.max(1, ballR * 0.035)
  ctx.beginPath()
  ctx.arc(cx, cy, sr, a0, a1, ccw)
  ctx.stroke()

  // Red chevron stitches
  for (let i = 0; i <= stitchCount; i++) {
    const t = i / stitchCount
    const a = seamArcAngle(a0, a1, t, ccw)
    const px = cx + sr * Math.cos(a)
    const py = cy + sr * Math.sin(a)
    const tangent = a + (ccw ? Math.PI / 2 : -Math.PI / 2)
    drawBaseballStitch(ctx, px, py, tangent, ballR)
  }

  ctx.restore()
}

function seamArcAngle(a0: number, a1: number, t: number, ccw: boolean): number {
  let delta = a1 - a0
  if (ccw) {
    if (delta > 0) delta -= Math.PI * 2
  } else if (delta < 0) {
    delta += Math.PI * 2
  }
  return a0 + t * delta
}

function drawBaseballStitch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tangent: number,
  ballR: number,
): void {
  const arm = ballR * 0.075
  const spread = ballR * 0.045
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tangent)
  ctx.fillStyle = "#dc2626"
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(side * spread, -arm * 0.35, side * spread * 0.55, -arm)
    ctx.quadraticCurveTo(side * spread * 0.2, -arm * 0.55, 0, 0)
    ctx.fill()
  }
  ctx.restore()
}

function drawTennisBall(ctx: CanvasRenderingContext2D, radius: number, phase: BallDrawPhase): void {
  if (phase !== "pattern") {
    const base = ctx.createRadialGradient(-radius * 0.15, -radius * 0.1, radius * 0.05, 0, 0, radius)
    base.addColorStop(0, "#c8f04a")
    base.addColorStop(0.55, "#a8d830")
    base.addColorStop(1, "#5f9010")
    ctx.fillStyle = base
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.clip()

    const leftGlow = ctx.createRadialGradient(-radius * 0.42, -radius * 0.05, 0, -radius * 0.3, 0, radius * 0.9)
    leftGlow.addColorStop(0, "rgba(228, 255, 130, 0.6)")
    leftGlow.addColorStop(0.55, "rgba(200, 240, 74, 0.18)")
    leftGlow.addColorStop(1, "rgba(200, 240, 74, 0)")
    ctx.fillStyle = leftGlow
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2)

    const edgeShadow = ctx.createRadialGradient(radius * 0.3, radius * 0.38, radius * 0.04, radius * 0.15, radius * 0.2, radius * 1.05)
    edgeShadow.addColorStop(0, "rgba(45, 78, 8, 0.5)")
    edgeShadow.addColorStop(0.55, "rgba(70, 110, 15, 0.22)")
    edgeShadow.addColorStop(1, "rgba(70, 110, 15, 0)")
    ctx.fillStyle = edgeShadow
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2)

    ctx.fillStyle = "rgba(240, 255, 210, 0.78)"
    ctx.beginPath()
    ctx.arc(radius * 0.28, -radius * 0.32, radius * 0.11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(240, 255, 210, 0.55)"
    ctx.beginPath()
    ctx.arc(radius * 0.38, -radius * 0.17, radius * 0.055, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  if (phase !== "lighting") {
    drawTennisBallSeams(ctx, radius)
  }
}

/** Two curved felt seams — upper-left and lower-right arcs on the ball surface. */
function drawTennisBallSeams(ctx: CanvasRenderingContext2D, radius: number): void {
  const r = radius
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.strokeStyle = "#ecece8"
  ctx.lineWidth = Math.max(2.5, r * 0.16)
  ctx.lineCap = "round"

  // Upper-left seam: left edge → inward bow → top edge
  ctx.beginPath()
  ctx.moveTo(-r * 0.7, -r * 0.55)
  ctx.bezierCurveTo(-r * 0.38, -r * 0.06, -r * 0.04, -r * 0.15, r * 0.1, -r * 0.9)
  ctx.stroke()

  // Lower-right seam: bottom edge → inward bow → right edge
  ctx.beginPath()
  ctx.moveTo(-r * 0.2, r * 0.9)
  ctx.bezierCurveTo(r * 0.06, r * 0.36, r * 0.4, r * 0.06, r * 0.9, -r * 0.12)
  ctx.stroke()

  ctx.restore()
}

function drawBasketball(ctx: CanvasRenderingContext2D, radius: number, phase: BallDrawPhase): void {
  if (phase !== "pattern") {
    const grd = ctx.createRadialGradient(-radius * 0.25, -radius * 0.3, 1, 0, 0, radius)
    grd.addColorStop(0, "#fdba74")
    grd.addColorStop(0.55, "#ea580c")
    grd.addColorStop(1, "#9a3412")
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  if (phase !== "lighting") {
    ctx.strokeStyle = "#1c1917"
    ctx.lineWidth = Math.max(1.2, radius * 0.08)
    ctx.beginPath()
    ctx.moveTo(-radius, 0)
    ctx.lineTo(radius, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, -radius)
    ctx.lineTo(0, radius)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, radius * 0.92, -0.6, 0.6)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, radius * 0.92, Math.PI - 0.6, Math.PI + 0.6)
    ctx.stroke()
  }
}

function drawBeachBall(ctx: CanvasRenderingContext2D, radius: number, phase: BallDrawPhase): void {
  if (phase !== "pattern") {
    drawClassicBall(ctx, radius, "#ffffff", "#f4f4f5", "#d4d4d8")
  }
  if (phase !== "lighting") {
    const colors = ["#ef4444", "#facc15", "#3b82f6", "#22c55e", "#ffffff"]
    const slices = colors.length
    for (let i = 0; i < slices; i++) {
      ctx.fillStyle = colors[i]!
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, (i / slices) * Math.PI * 2, ((i + 1) / slices) * Math.PI * 2)
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = "rgba(0,0,0,0.12)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawBowlingBall(ctx: CanvasRenderingContext2D, radius: number, phase: BallDrawPhase): void {
  if (phase !== "pattern") {
    const grd = ctx.createRadialGradient(-radius * 0.25, -radius * 0.3, 1, 0, 0, radius)
    grd.addColorStop(0, "#475569")
    grd.addColorStop(0.55, "#1e293b")
    grd.addColorStop(1, "#0f172a")
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.15)"
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  if (phase !== "lighting") {
    ctx.fillStyle = "#f8fafc"
    const holes = [
      [0, -radius * 0.35],
      [-radius * 0.28, radius * 0.12],
      [radius * 0.28, radius * 0.12],
    ]
    for (const [hx, hy] of holes) {
      ctx.beginPath()
      ctx.arc(hx, hy, radius * 0.11, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawVolleyballBall(ctx: CanvasRenderingContext2D, radius: number, phase: BallDrawPhase): void {
  if (phase !== "pattern") drawClassicBall(ctx, radius, "#ffffff", "#f8fafc", "#e2e8f0")
  if (phase !== "lighting") {
    ctx.strokeStyle = "#1d4ed8"
    ctx.lineWidth = Math.max(1.2, radius * 0.09)
    ctx.lineCap = "round"
    const curves = [
      [[-radius * 0.9, 0], [0, -radius * 0.85], [radius * 0.9, 0]],
      [[-radius * 0.9, 0], [0, radius * 0.85], [radius * 0.9, 0]],
      [[0, -radius * 0.9], [radius * 0.75, 0], [0, radius * 0.9], [-radius * 0.75, 0]],
    ]
    for (const pts of curves) {
      ctx.beginPath()
      if (pts.length === 3) {
        ctx.moveTo(pts[0]![0], pts[0]![1])
        ctx.quadraticCurveTo(pts[1]![0], pts[1]![1], pts[2]![0], pts[2]![1])
      } else {
        ctx.moveTo(pts[0]![0], pts[0]![1])
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i]![0], pts[i]![1])
        }
      }
      ctx.stroke()
    }
    ctx.fillStyle = "#facc15"
    ctx.beginPath()
    ctx.arc(0, -radius * 0.55, radius * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Mini slingshot icon for menu pickers. */
export function drawSlingshotIconStyle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  style: SlingshotStyle,
  time: number,
): void {
  const geom = iconSlingshotGeometry(cx, cy, size)
  drawSlingshotFork(ctx, geom, style, time, size * 0.11, size * 0.055)
  const pouch = { x: cx, y: cy + size * 0.14 }
  drawSlingshotBands(
    ctx,
    { x: geom.left.x, y: geom.left.y },
    { x: geom.right.x, y: geom.right.y },
    pouch,
    style,
    time,
    Math.max(1.5, size * 0.055),
  )
}

/** Procedural fork used only until `slings/<id>` art has loaded. */
export function drawSlingshotFork(
  ctx: CanvasRenderingContext2D,
  geom: SlingshotGeom,
  style: SlingshotStyle,
  _time: number,
  postWidth: number,
  forkWidth: number,
): void {
  ctx.save()
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  drawClassicFork(ctx, geom, slingBand(style).color, postWidth, forkWidth)
  ctx.restore()
}

export interface SlingshotGeom {
  base: { x: number; y: number }
  left: { x: number; y: number }
  right: { x: number; y: number }
  rest: { x: number; y: number }
}

export function iconSlingshotGeometry(cx: number, cy: number, size: number): SlingshotGeom {
  const w = size * 0.88
  const h = size
  return {
    base: { x: cx, y: cy + h * 0.32 },
    rest: { x: cx, y: cy - h * 0.02 },
    left: { x: cx - w * 0.42, y: cy - h * 0.22 },
    right: { x: cx + w * 0.42, y: cy - h * 0.22 },
  }
}

function drawClassicFork(
  ctx: CanvasRenderingContext2D,
  geom: SlingshotGeom,
  color: string,
  postWidth: number,
  forkWidth: number,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = postWidth
  ctx.beginPath()
  ctx.moveTo(geom.base.x, geom.base.y)
  ctx.lineTo(geom.rest.x, geom.rest.y + 4)
  ctx.stroke()
  ctx.lineWidth = forkWidth
  ctx.beginPath()
  ctx.moveTo(geom.left.x, geom.left.y)
  ctx.lineTo(geom.rest.x, geom.rest.y + 3)
  ctx.lineTo(geom.right.x, geom.right.y)
  ctx.stroke()
}

/** Classic aim pulse. Change this one line to restore the old blue glow. */
export const CLASSIC_AIM_GLOW = "#E8443A"

/** Draw rubber bands from fork tips to pouch. Colour, core, and dashes come from the manifest. */
export function drawSlingshotBands(
  ctx: CanvasRenderingContext2D,
  left: { x: number; y: number },
  right: { x: number; y: number },
  pouch: { x: number; y: number },
  style: SlingshotStyle,
  _time: number,
  lineWidth = 3.5,
): void {
  const band = slingBand(style)
  const width = lineWidth
  const coreWidth = (band.pattern?.core_width_css ?? 1.2) * (width / band.width_css)
  ctx.save()
  ctx.lineCap = "round"
  ctx.lineWidth = width
  ctx.strokeStyle = band.color

  const drawBand = (x1: number, y1: number) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo((x1 + pouch.x) * 0.5, (y1 + pouch.y) * 0.5 + 6, pouch.x, pouch.y)
    ctx.stroke()
    ctx.strokeStyle = band.core
    ctx.lineWidth = coreWidth
    if (band.pattern) ctx.setLineDash(band.pattern.dash_css)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = band.color
    ctx.lineWidth = width
  }

  drawBand(left.x, left.y)
  drawBand(right.x, right.y)
  ctx.restore()
}

export function slingshotAccentColor(style: SlingshotStyle, _time: number): string {
  if (style === "classic") return CLASSIC_AIM_GLOW
  return slingBand(style).accent
}
