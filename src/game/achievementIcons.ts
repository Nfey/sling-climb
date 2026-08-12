/**
 * Canvas-drawn achievement icons. Each glyph is a small geometric mark;
 * callers pass `colored` false for locked (grey) and true for unlocked.
 */

import type { AchievementDef } from "./achievements"

export type AchievementIconKind =
  | "speed1"
  | "speed2"
  | "speed3"
  | "speed4"
  | "height1"
  | "height2"
  | "height3"
  | "height4"
  | "score1"
  | "score2"
  | "score3"
  | "score4"
  | "hits1"
  | "hits2"
  | "hits3"
  | "hits4"
  | "coins1"
  | "coins2"
  | "coins3"
  | "coins4"
  | "failBamboozled"
  | "failSouth"
  | "failWhiff"
  | "failClose"
  | "failIcarus"
  | "failTurret"
  | "failCold"

const ICON_COLORS: Record<AchievementIconKind, string> = {
  speed1: "#38bdf8",
  speed2: "#0ea5e9",
  speed3: "#0284c7",
  speed4: "#6366f1",
  height1: "#86efac",
  height2: "#22c55e",
  height3: "#16a34a",
  height4: "#0f766e",
  score1: "#fbbf24",
  score2: "#f59e0b",
  score3: "#d97706",
  score4: "#b45309",
  hits1: "#fb7185",
  hits2: "#f43f5e",
  hits3: "#e11d48",
  hits4: "#be123c",
  coins1: "#fde047",
  coins2: "#eab308",
  coins3: "#ca8a04",
  coins4: "#a16207",
  failBamboozled: "#f59e0b",
  failSouth: "#ef4444",
  failWhiff: "#94a3b8",
  failClose: "#2f6fed",
  failIcarus: "#f97316",
  failTurret: "#64748b",
  failCold: "#67e8f9",
}

const LOCKED_FILL = "#94a3b8"
const LOCKED_STROKE = "#64748b"

export function achievementIconColor(kind: AchievementIconKind, unlocked: boolean): string {
  return unlocked ? ICON_COLORS[kind] : LOCKED_FILL
}

export function drawAchievementIcon(
  ctx: CanvasRenderingContext2D,
  kind: AchievementIconKind,
  cx: number,
  cy: number,
  size: number,
  unlocked: boolean,
): void {
  const color = achievementIconColor(kind, unlocked)
  const stroke = unlocked ? color : LOCKED_STROKE
  ctx.save()
  ctx.translate(cx, cy)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  switch (kind) {
    case "speed1":
      drawSpeedLines(ctx, size, color, 2)
      break
    case "speed2":
      drawBolt(ctx, size, color)
      break
    case "speed3":
      drawBoom(ctx, size, color, stroke)
      break
    case "speed4":
      drawWarp(ctx, size, color, stroke)
      break
    case "height1":
      drawPeaks(ctx, size, color, 1)
      break
    case "height2":
      drawPeaks(ctx, size, color, 2)
      break
    case "height3":
      drawPeaks(ctx, size, color, 3)
      drawCloud(ctx, size, stroke)
      break
    case "height4":
      drawRocket(ctx, size, color, stroke)
      break
    case "score1":
      drawStar(ctx, size * 0.42, color, 5)
      break
    case "score2":
      drawStar(ctx, size * 0.28, color, 5)
      ctx.translate(size * 0.22, size * 0.12)
      drawStar(ctx, size * 0.22, color, 5)
      ctx.translate(-size * 0.44, 0.02 * size)
      drawStar(ctx, size * 0.22, color, 5)
      break
    case "score3":
      drawTrophy(ctx, size, color, stroke)
      break
    case "score4":
      drawCrown(ctx, size, color, stroke)
      break
    case "hits1":
      drawDots(ctx, size, color, 3)
      break
    case "hits2":
      drawDots(ctx, size, color, 5)
      break
    case "hits3":
      drawPinball(ctx, size, color, stroke)
      break
    case "hits4":
      drawBurst(ctx, size, color, stroke)
      break
    case "coins1":
      drawCoin(ctx, 0, 0, size * 0.32, color, stroke)
      break
    case "coins2":
      drawCoin(ctx, -size * 0.14, size * 0.06, size * 0.26, color, stroke)
      drawCoin(ctx, size * 0.14, -size * 0.04, size * 0.28, color, stroke)
      break
    case "coins3":
      drawChest(ctx, size, color, stroke)
      break
    case "coins4":
      drawHoard(ctx, size, color, stroke)
      break
    case "failBamboozled":
      drawArrowPad(ctx, size, color, stroke)
      drawXMark(ctx, size * 0.22, size * 0.22, size * 0.28, stroke)
      break
    case "failSouth":
      drawDownArrow(ctx, size, color, stroke)
      break
    case "failWhiff":
      drawWhiff(ctx, size, color, stroke)
      break
    case "failClose":
      drawNearMiss(ctx, size, color, stroke)
      break
    case "failIcarus":
      drawIcarus(ctx, size, color, stroke)
      break
    case "failTurret":
      drawTurretIcon(ctx, size, color, stroke)
      break
    case "failCold":
      drawColdOpen(ctx, size, color, stroke)
      break
  }

  ctx.restore()
}

export function iconKindForAchievement(def: AchievementDef): AchievementIconKind {
  return def.icon
}

function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  count: number,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, size * 0.08)
  for (let i = 0; i < count; i++) {
    const y = -size * 0.22 + i * size * 0.22
    ctx.beginPath()
    ctx.moveTo(-size * 0.32, y)
    ctx.lineTo(size * 0.32, y)
    ctx.stroke()
  }
}

function drawBolt(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const s = size * 0.42
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(s * 0.15, -s)
  ctx.lineTo(-s * 0.15, -s * 0.05)
  ctx.lineTo(s * 0.05, -s * 0.05)
  ctx.lineTo(-s * 0.15, s)
  ctx.lineTo(s * 0.2, s * 0.05)
  ctx.lineTo(s * 0.02, s * 0.05)
  ctx.closePath()
  ctx.fill()
}

function drawBoom(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.06)
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.12 * i, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2)
  ctx.fill()
}

function drawWarp(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.07)
  ctx.beginPath()
  for (let i = 0; i < 28; i++) {
    const t = i / 28
    const a = t * Math.PI * 3.2
    const r = size * 0.08 + t * size * 0.34
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.07, 0, Math.PI * 2)
  ctx.fill()
}

function drawPeaks(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  peaks: number,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-size * 0.4, size * 0.32)
  if (peaks === 1) {
    ctx.lineTo(0, -size * 0.28)
    ctx.lineTo(size * 0.4, size * 0.32)
  } else if (peaks === 2) {
    ctx.lineTo(-size * 0.12, -size * 0.1)
    ctx.lineTo(0.02 * size, size * 0.08)
    ctx.lineTo(size * 0.18, -size * 0.32)
    ctx.lineTo(size * 0.4, size * 0.32)
  } else {
    ctx.lineTo(-size * 0.2, -size * 0.08)
    ctx.lineTo(-size * 0.05, size * 0.1)
    ctx.lineTo(size * 0.05, -size * 0.34)
    ctx.lineTo(size * 0.22, size * 0.05)
    ctx.lineTo(size * 0.32, -size * 0.12)
    ctx.lineTo(size * 0.42, size * 0.32)
  }
  ctx.closePath()
  ctx.fill()
}

function drawCloud(ctx: CanvasRenderingContext2D, size: number, stroke: string): void {
  ctx.fillStyle = stroke
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.arc(-size * 0.08, -size * 0.28, size * 0.1, 0, Math.PI * 2)
  ctx.arc(size * 0.06, -size * 0.3, size * 0.12, 0, Math.PI * 2)
  ctx.arc(size * 0.18, -size * 0.24, size * 0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawRocket(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, -size * 0.36)
  ctx.lineTo(size * 0.16, size * 0.08)
  ctx.lineTo(-size * 0.16, size * 0.08)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = stroke
  ctx.beginPath()
  ctx.moveTo(-size * 0.16, size * 0.08)
  ctx.lineTo(-size * 0.26, size * 0.28)
  ctx.lineTo(-size * 0.04, size * 0.12)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(size * 0.16, size * 0.08)
  ctx.lineTo(size * 0.26, size * 0.28)
  ctx.lineTo(size * 0.04, size * 0.12)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = "#f97316"
  if (stroke === LOCKED_STROKE) ctx.fillStyle = stroke
  ctx.beginPath()
  ctx.moveTo(-size * 0.08, size * 0.1)
  ctx.lineTo(0, size * 0.34)
  ctx.lineTo(size * 0.08, size * 0.1)
  ctx.closePath()
  ctx.fill()
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  r: number,
  color: string,
  points: number,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points
    const rad = i % 2 === 0 ? r : r * 0.45
    const x = Math.cos(a) * rad
    const y = Math.sin(a) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

function drawTrophy(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-size * 0.18, -size * 0.22)
  ctx.lineTo(size * 0.18, -size * 0.22)
  ctx.quadraticCurveTo(size * 0.22, size * 0.05, 0, size * 0.12)
  ctx.quadraticCurveTo(-size * 0.22, size * 0.05, -size * 0.18, -size * 0.22)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.06)
  ctx.beginPath()
  ctx.arc(-size * 0.18, -size * 0.08, size * 0.12, -Math.PI / 2, Math.PI / 2, true)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(size * 0.18, -size * 0.08, size * 0.12, -Math.PI / 2, Math.PI / 2, false)
  ctx.stroke()
  ctx.fillStyle = stroke
  ctx.fillRect(-size * 0.05, size * 0.12, size * 0.1, size * 0.12)
  ctx.fillRect(-size * 0.16, size * 0.24, size * 0.32, size * 0.08)
}

function drawCrown(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-size * 0.34, size * 0.16)
  ctx.lineTo(-size * 0.28, -size * 0.18)
  ctx.lineTo(-size * 0.1, size * 0.02)
  ctx.lineTo(0, -size * 0.3)
  ctx.lineTo(size * 0.1, size * 0.02)
  ctx.lineTo(size * 0.28, -size * 0.18)
  ctx.lineTo(size * 0.34, size * 0.16)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(1.5, size * 0.05)
  ctx.stroke()
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  count: number,
): void {
  ctx.fillStyle = color
  const r = size * 0.1
  if (count <= 3) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / count
      ctx.beginPath()
      ctx.arc(Math.cos(a) * size * 0.22, Math.sin(a) * size * 0.22, r, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    const positions = [
      [0, -0.22],
      [-0.22, 0.05],
      [0.22, 0.05],
      [-0.12, 0.26],
      [0.12, 0.26],
    ]
    for (let i = 0; i < count && i < positions.length; i++) {
      const [x, y] = positions[i]!
      ctx.beginPath()
      ctx.arc(x * size, y * size, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawPinball(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.07)
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(-size * 0.08, -size * 0.06, size * 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(size * 0.12, size * 0.1, size * 0.08, 0, Math.PI * 2)
  ctx.fill()
}

function drawBurst(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.06)
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * size * 0.1, Math.sin(a) * size * 0.1)
    ctx.lineTo(Math.cos(a) * size * 0.36, Math.sin(a) * size * 0.36)
    ctx.stroke()
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2)
  ctx.fill()
}

function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  stroke: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(1.5, r * 0.18)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2)
  ctx.stroke()
}

function drawChest(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.fillStyle = color
  ctx.fillRect(-size * 0.3, -size * 0.05, size * 0.6, size * 0.32)
  ctx.fillStyle = stroke
  ctx.fillRect(-size * 0.3, -size * 0.22, size * 0.6, size * 0.18)
  ctx.fillStyle = color
  ctx.fillRect(-size * 0.06, -size * 0.02, size * 0.12, size * 0.12)
}

function drawHoard(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  drawCoin(ctx, -size * 0.16, size * 0.12, size * 0.14, color, stroke)
  drawCoin(ctx, size * 0.14, size * 0.14, size * 0.14, color, stroke)
  drawCoin(ctx, 0, -size * 0.02, size * 0.16, color, stroke)
  ctx.fillStyle = stroke
  ctx.beginPath()
  ctx.moveTo(-size * 0.08, -size * 0.28)
  ctx.quadraticCurveTo(0, -size * 0.4, size * 0.08, -size * 0.28)
  ctx.quadraticCurveTo(size * 0.18, -size * 0.18, size * 0.08, -size * 0.12)
  ctx.lineTo(-size * 0.08, -size * 0.12)
  ctx.quadraticCurveTo(-size * 0.18, -size * 0.18, -size * 0.08, -size * 0.28)
  ctx.fill()
}

function drawArrowPad(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.06)
  ctx.stroke()
  ctx.fillStyle = stroke
  ctx.beginPath()
  ctx.moveTo(0, -size * 0.18)
  ctx.lineTo(size * 0.12, size * 0.04)
  ctx.lineTo(size * 0.04, size * 0.04)
  ctx.lineTo(size * 0.04, size * 0.16)
  ctx.lineTo(-size * 0.04, size * 0.16)
  ctx.lineTo(-size * 0.04, size * 0.04)
  ctx.lineTo(-size * 0.12, size * 0.04)
  ctx.closePath()
  ctx.fill()
}

function drawXMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  stroke: string,
): void {
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2.5, s * 0.35)
  ctx.beginPath()
  ctx.moveTo(x - s * 0.5, y - s * 0.5)
  ctx.lineTo(x + s * 0.5, y + s * 0.5)
  ctx.moveTo(x + s * 0.5, y - s * 0.5)
  ctx.lineTo(x - s * 0.5, y + s * 0.5)
  ctx.stroke()
}

function drawDownArrow(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, size * 0.32)
  ctx.lineTo(size * 0.28, 0)
  ctx.lineTo(size * 0.1, 0)
  ctx.lineTo(size * 0.1, -size * 0.32)
  ctx.lineTo(-size * 0.1, -size * 0.32)
  ctx.lineTo(-size * 0.1, 0)
  ctx.lineTo(-size * 0.28, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(1.5, size * 0.05)
  ctx.stroke()
}

function drawWhiff(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.08)
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.28, 0.2, Math.PI * 1.6)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-size * 0.3, size * 0.3)
  ctx.lineTo(size * 0.3, -size * 0.3)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(size * 0.18, -size * 0.18, size * 0.08, 0, Math.PI * 2)
  ctx.fill()
}

function drawNearMiss(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.07)
  ctx.beginPath()
  ctx.arc(0, size * 0.08, size * 0.28, Math.PI * 1.15, Math.PI * 1.85)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(-size * 0.06, -size * 0.1, size * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.beginPath()
  ctx.moveTo(size * 0.1, size * 0.02)
  ctx.lineTo(size * 0.3, size * 0.22)
  ctx.stroke()
}

function drawIcarus(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, -size * 0.18, size * 0.14, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.06)
  ctx.beginPath()
  ctx.moveTo(-size * 0.34, size * 0.05)
  ctx.quadraticCurveTo(-size * 0.1, -size * 0.05, 0, size * 0.12)
  ctx.quadraticCurveTo(size * 0.1, -size * 0.05, size * 0.34, size * 0.05)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, size * 0.12)
  ctx.lineTo(0, size * 0.32)
  ctx.stroke()
}

function drawTurretIcon(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(-size * 0.12, 0, size * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = stroke
  ctx.fillRect(-size * 0.02, -size * 0.07, size * 0.34, size * 0.14)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(size * 0.28, 0, size * 0.07, 0, Math.PI * 2)
  ctx.fill()
}

function drawColdOpen(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  stroke: string,
): void {
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(2, size * 0.07)
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * size * 0.32, Math.sin(a) * size * 0.32)
    ctx.stroke()
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2)
  ctx.fill()
}
