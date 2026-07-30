import { Camera } from "./Camera"
import type { BackgroundStyle } from "./backgrounds"

export function drawBackgroundStyle(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  style: BackgroundStyle,
  time: number,
  bgHeight: number,
): void {
  const { width } = camera
  switch (style) {
    case "sky":
      drawSky(ctx, width, bgHeight, camera.y, time)
      break
    case "space":
      drawSpace(ctx, width, bgHeight, camera.y, time)
      break
    case "rain":
      drawRain(ctx, width, bgHeight, camera.y, time)
      break
    case "cute":
      drawCute(ctx, width, bgHeight, camera.y, time)
      break
    case "emo":
      drawEmo(ctx, width, bgHeight, camera.y, time)
      break
    case "anime":
      drawAnime(ctx, width, bgHeight, camera.y, time)
      break
    case "grunge":
      drawGrunge(ctx, width, bgHeight, camera.y, time)
      break
    case "sunset":
      drawSunset(ctx, width, bgHeight, camera.y, time)
      break
    case "neon":
      drawNeon(ctx, width, bgHeight, camera.y, time)
      break
    case "aurora":
      drawAurora(ctx, width, bgHeight, camera.y, time)
      break
  }
}

/** Small swatch for the menu picker icon. */
export function drawBackgroundPreview(
  ctx: CanvasRenderingContext2D,
  size: number,
  style: BackgroundStyle,
  time: number,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2)
  ctx.clip()
  drawBackgroundStyle(ctx, makePreviewCamera(size), style, time, size * 0.85)
  ctx.restore()

  ctx.strokeStyle = "rgba(17, 17, 17, 0.12)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2)
  ctx.stroke()
}

function makePreviewCamera(size: number): Camera {
  const cam = new Camera()
  cam.resize(size, size, 1)
  return cam
}

function fillGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stops: readonly [number, string][],
): void {
  const grd = ctx.createLinearGradient(0, 0, 0, height)
  for (const [pos, color] of stops) grd.addColorStop(pos, color)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, width, height)
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  width: number,
  killY: number,
  camY: number,
  time: number,
): void {
  fillGradient(ctx, width, killY, [
    [0, "#38bdf8"],
    [0.55, "#7dd3fc"],
    [1, "#bae6fd"],
  ])

  const scroll = (camY * 0.08 + time * 18) % (width + 120)
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)"
  for (let i = -1; i < 4; i++) {
    const cx = i * (width * 0.45) - scroll
    const cy = killY * (0.18 + (i % 3) * 0.12)
    drawCloud(ctx, cx, cy, 28 + (i % 2) * 10)
  }
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.arc(x + r * 0.9, y - r * 0.2, r * 0.75, 0, Math.PI * 2)
  ctx.arc(x + r * 1.7, y, r * 0.85, 0, Math.PI * 2)
  ctx.fill()
}

function drawSpace(
  ctx: CanvasRenderingContext2D,
  width: number,
  killY: number,
  camY: number,
  time: number,
): void {
  fillGradient(ctx, width, killY, [
    [0, "#0f0a2e"],
    [0.5, "#1e1b4b"],
    [1, "#312e81"],
  ])

  const nebula = ctx.createRadialGradient(
    width * 0.3,
    killY * 0.35,
    0,
    width * 0.3,
    killY * 0.35,
    width * 0.7,
  )
  nebula.addColorStop(0, "rgba(168, 85, 247, 0.35)")
  nebula.addColorStop(0.5, "rgba(236, 72, 153, 0.15)")
  nebula.addColorStop(1, "rgba(0, 0, 0, 0)")
  ctx.fillStyle = nebula
  ctx.fillRect(0, 0, width, killY)

  const seed = Math.floor(camY / 500)
  for (let i = 0; i < 80; i++) {
    const sx = pseudoRandom(seed + i * 17) * width
    const sy = pseudoRandom(seed + i * 31) * killY
    const twinkle = 0.4 + Math.sin(time * 3 + i) * 0.3
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`
    const sr = pseudoRandom(seed + i * 7) > 0.85 ? 1.8 : 1
    ctx.fillRect(sx, sy, sr, sr)
  }
}

function drawRain(
  ctx: CanvasRenderingContext2D,
  width: number,
  bgHeight: number,
  camY: number,
  time: number,
): void {
  fillGradient(ctx, width, bgHeight, [
    [0, "#94a3b8"],
    [0.45, "#b0bec9"],
    [0.75, "#cbd5e1"],
    [1, "#e2e8f0"],
  ])

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)"
  for (let i = 0; i < 5; i++) {
    const cx = pseudoRandom(i * 29 + 3) * width
    const cy = bgHeight * (0.08 + pseudoRandom(i * 17) * 0.35)
    drawCloud(ctx, cx, cy, 36 + i * 8)
  }
  ctx.fillStyle = "rgba(248, 250, 252, 0.28)"
  for (let i = 0; i < 4; i++) {
    const cx = pseudoRandom(i * 41 + 7) * width
    const cy = bgHeight * (0.25 + pseudoRandom(i * 23) * 0.4)
    drawCloud(ctx, cx, cy, 48 + i * 6)
  }

  ctx.strokeStyle = "rgba(100, 116, 139, 0.18)"
  ctx.lineWidth = 1
  const offset = (time * 55 + camY * 0.08) % 48
  const dropCount = 28
  for (let i = 0; i < dropCount; i++) {
    const x = pseudoRandom(i * 13 + 5) * width
    const baseY = pseudoRandom(i * 31 + 11) * bgHeight
    const y = (baseY + offset * (0.6 + pseudoRandom(i * 7) * 0.4)) % (bgHeight + 20) - 10
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 1.5, y + 7)
    ctx.stroke()
  }
}

function drawCute(
  ctx: CanvasRenderingContext2D,
  width: number,
  killY: number,
  camY: number,
  time: number,
): void {
  fillGradient(ctx, width, killY, [
    [0, "#fbcfe8"],
    [0.5, "#f9a8d4"],
    [1, "#fce7f3"],
  ])

  const scroll = camY * 0.06 + time * 12
  for (let i = 0; i < 6; i++) {
    const hx = (pseudoRandom(i * 13 + 1) * width + scroll * (0.3 + i * 0.05)) % (width + 40) - 20
    const hy = killY * (0.12 + pseudoRandom(i * 19) * 0.7)
    drawHeart(ctx, hx, hy, 6 + (i % 3) * 2, `rgba(244, 63, 94, ${0.25 + (i % 2) * 0.15})`)
  }

  for (let i = 0; i < 8; i++) {
    const sx = pseudoRandom(i * 41 + 2) * width
    const sy = pseudoRandom(i * 53 + 3) * killY
    const pulse = 0.5 + Math.sin(time * 4 + i * 1.7) * 0.5
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.8})`
    drawStar(ctx, sx, sy, 3 + (i % 2), 4)
  }
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y + r * 0.3)
  ctx.bezierCurveTo(x, y - r * 0.3, x - r, y - r * 0.3, x - r, y + r * 0.1)
  ctx.bezierCurveTo(x - r, y + r * 0.7, x, y + r * 0.9, x, y + r * 1.1)
  ctx.bezierCurveTo(x, y + r * 0.9, x + r, y + r * 0.7, x + r, y + r * 0.1)
  ctx.bezierCurveTo(x + r, y - r * 0.3, x, y - r * 0.3, x, y + r * 0.3)
  ctx.fill()
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  points: number,
): void {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : outerR * 0.4
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const px = cx + Math.cos(a) * r
    const py = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function drawEmo(
  ctx: CanvasRenderingContext2D,
  width: number,
  killY: number,
  camY: number,
  time: number,
): void {
  fillGradient(ctx, width, killY, [
    [0, "#0a0a0f"],
    [0.45, "#1a1025"],
    [1, "#2d1b3d"],
  ])

  ctx.strokeStyle = "rgba(139, 92, 246, 0.2)"
  ctx.lineWidth = 1
  const dripOffset = (camY * 0.04 + time * 8) % 40
  for (let x = 20; x < width; x += 48) {
    const len = 30 + pseudoRandom(x) * 60
    ctx.beginPath()
    ctx.moveTo(x, -dripOffset)
    ctx.lineTo(x + Math.sin(time + x) * 4, len)
    ctx.stroke()
  }

  ctx.fillStyle = "rgba(139, 92, 246, 0.08)"
  ctx.beginPath()
  ctx.ellipse(width * 0.5, killY * 0.6, width * 0.6, killY * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawAnime(
  ctx: CanvasRenderingContext2D,
  width: number,
  killY: number,
  camY: number,
  time: number,
): void {
  fillGradient(ctx, width, killY, [
    [0, "#fda4af"],
    [0.35, "#fbcfe8"],
    [0.7, "#e0e7ff"],
    [1, "#c7d2fe"],
  ])

  const sunX = width * 0.75
  const sunY = killY * 0.22
  const sunGrd = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 70)
  sunGrd.addColorStop(0, "rgba(255, 255, 200, 0.9)")
  sunGrd.addColorStop(0.4, "rgba(255, 200, 150, 0.4)")
  sunGrd.addColorStop(1, "rgba(255, 200, 150, 0)")
  ctx.fillStyle = sunGrd
  ctx.fillRect(0, 0, width, killY)

  const petalScroll = camY * 0.12 + time * 20
  for (let i = 0; i < 12; i++) {
    const px = (pseudoRandom(i * 23) * width + petalScroll * (0.5 + i * 0.03)) % (width + 30) - 15
    const py = (pseudoRandom(i * 37) * killY + petalScroll * 0.08) % (killY + 20)
    const rot = time * 0.5 + i
    drawPetal(ctx, px, py, 5 + (i % 3), rot)
  }
}

function drawPetal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = "rgba(251, 113, 133, 0.65)"
  ctx.beginPath()
  ctx.ellipse(0, 0, r, r * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawGrunge(
  ctx: CanvasRenderingContext2D,
  width: number,
  killY: number,
  camY: number,
  _time: number,
): void {
  fillGradient(ctx, width, killY, [
    [0, "#9a3412"],
    [0.4, "#c2410c"],
    [0.75, "#ea580c"],
    [1, "#fdba74"],
  ])

  const seed = Math.floor(camY / 300)
  ctx.globalAlpha = 0.12
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = pseudoRandom(seed + i) > 0.5 ? "#451a03" : "#292524"
    const rx = pseudoRandom(seed + i * 3) * width
    const ry = pseudoRandom(seed + i * 5) * killY
    const rw = 20 + pseudoRandom(seed + i * 7) * 80
    const rh = 4 + pseudoRandom(seed + i * 11) * 12
    ctx.fillRect(rx, ry, rw, rh)
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = "rgba(69, 26, 3, 0.25)"
  ctx.lineWidth = 2
  for (let y = 0; y < killY; y += 32) {
    ctx.beginPath()
    ctx.moveTo(0, y + (seed % 16))
    ctx.lineTo(width, y + 16 + (seed % 16))
    ctx.stroke()
  }
}

function drawSunset(
  ctx: CanvasRenderingContext2D,
  width: number,
  killY: number,
  _camY: number,
  _time: number,
): void {
  fillGradient(ctx, width, killY, [
    [0, "#312e81"],
    [0.3, "#7c3aed"],
    [0.55, "#f97316"],
    [0.75, "#fb923c"],
    [1, "#fde68a"],
  ])

  ctx.fillStyle = "rgba(253, 224, 71, 0.35)"
  ctx.beginPath()
  ctx.arc(width * 0.5, killY * 0.72, width * 0.35, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
  ctx.beginPath()
  ctx.moveTo(0, killY * 0.78)
  for (let x = 0; x <= width; x += 40) {
    const h = 8 + pseudoRandom(x) * 24
    ctx.lineTo(x, killY * 0.78 - h)
  }
  ctx.lineTo(width, killY)
  ctx.lineTo(0, killY)
  ctx.closePath()
  ctx.fill()
}

function drawNeon(
  ctx: CanvasRenderingContext2D,
  width: number,
  killY: number,
  camY: number,
  time: number,
): void {
  fillGradient(ctx, width, killY, [
    [0, "#0f0518"],
    [0.5, "#1a0a2e"],
    [1, "#0f172a"],
  ])

  const gridY = killY * 0.65
  ctx.strokeStyle = "rgba(236, 72, 153, 0.35)"
  ctx.lineWidth = 1
  const gridScroll = (camY * 0.15 + time * 30) % 40
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, gridY)
    ctx.lineTo(x - 20, killY + gridScroll)
    ctx.stroke()
  }
  ctx.strokeStyle = "rgba(34, 211, 238, 0.3)"
  for (let y = gridY; y < killY + 40; y += 20) {
    ctx.beginPath()
    ctx.moveTo(0, y + gridScroll * 0.5)
    ctx.lineTo(width, y + gridScroll * 0.5)
    ctx.stroke()
  }

  const glow = 0.6 + Math.sin(time * 2) * 0.2
  ctx.fillStyle = `rgba(236, 72, 153, ${glow * 0.6})`
  ctx.shadowColor = "#ec4899"
  ctx.shadowBlur = 20
  ctx.fillRect(width * 0.15, killY * 0.3, width * 0.12, killY * 0.04)
  ctx.fillStyle = `rgba(34, 211, 238, ${glow * 0.5})`
  ctx.shadowColor = "#22d3ee"
  ctx.fillRect(width * 0.6, killY * 0.45, width * 0.18, killY * 0.035)
  ctx.shadowBlur = 0
}

function drawAurora(
  ctx: CanvasRenderingContext2D,
  width: number,
  killY: number,
  camY: number,
  time: number,
): void {
  fillGradient(ctx, width, killY, [
    [0, "#020617"],
    [0.4, "#0f172a"],
    [1, "#1e293b"],
  ])

  const wave = Math.sin(time * 0.8 + camY * 0.001) * 30
  for (let band = 0; band < 3; band++) {
    const colors = [
      ["rgba(52, 211, 153, 0.35)", "rgba(16, 185, 129, 0)"],
      ["rgba(139, 92, 246, 0.3)", "rgba(139, 92, 246, 0)"],
      ["rgba(56, 189, 248, 0.25)", "rgba(56, 189, 248, 0)"],
    ][band]!
    const grd = ctx.createLinearGradient(0, killY * 0.1 + band * 40 + wave, 0, killY * 0.55 + band * 30)
    grd.addColorStop(0, colors[0])
    grd.addColorStop(1, colors[1])
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.moveTo(0, killY * 0.15 + band * 35 + wave)
    for (let x = 0; x <= width; x += 20) {
      const y =
        killY * 0.2 +
        band * 35 +
        wave +
        Math.sin(x * 0.008 + time + band) * 25 +
        Math.sin(x * 0.015 + time * 0.7) * 15
      ctx.lineTo(x, y)
    }
    ctx.lineTo(width, killY * 0.6)
    ctx.lineTo(0, killY * 0.6)
    ctx.closePath()
    ctx.fill()
  }

  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + pseudoRandom(i) * 0.5})`
    ctx.fillRect(pseudoRandom(i * 7) * width, pseudoRandom(i * 13) * killY * 0.5, 1, 1)
  }
}

function pseudoRandom(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
