/** Launch trails: separate gacha cosmetics (visual only). */

import { trailStamp } from "./art/cosmeticsData"
import { drawSprite, getSprite, spriteFrame } from "./art/sprites"
import type { CosmeticRarity } from "./rarity"
import type { Vec2 } from "./types"

export type TrailStyle =
  | "none"
  | "dust"
  | "sparkle"
  | "bubbles"
  | "sage"
  | "hearts"
  | "confetti"
  | "ribbon"
  | "feathers"
  | "stars"
  | "flame"
  | "blooms"
  | "rainbow"
  | "lightning"

export interface TrailVariant {
  id: string
  name: string
  style: TrailStyle
  rarity: CosmeticRarity
}

export const TRAIL_UNLOCKS_KEY = "sling-climb-trail-unlocks"
export const EQUIPPED_TRAIL_KEY = "sling-climb-equipped-trail"
export const TRAIL_GACHA_PITY_KEY = "sling-climb-trail-gacha-pity"

export const TRAIL_VARIANTS: readonly TrailVariant[] = [
  { id: "dust", name: "Canyon Dust", style: "dust", rarity: "common" },
  { id: "sparkle", name: "Glint", style: "sparkle", rarity: "common" },
  { id: "bubbles", name: "Bubbles", style: "bubbles", rarity: "common" },
  { id: "sage", name: "Sage", style: "sage", rarity: "common" },
  { id: "hearts", name: "Hearts", style: "hearts", rarity: "uncommon" },
  { id: "confetti", name: "Confetti", style: "confetti", rarity: "uncommon" },
  { id: "ribbon", name: "Ribbon", style: "ribbon", rarity: "uncommon" },
  { id: "feathers", name: "Feathers", style: "feathers", rarity: "uncommon" },
  { id: "stars", name: "Stars", style: "stars", rarity: "rare" },
  { id: "flame", name: "Ember", style: "flame", rarity: "rare" },
  { id: "blooms", name: "Blooms", style: "blooms", rarity: "rare" },
  { id: "rainbow", name: "Rainbow", style: "rainbow", rarity: "epic" },
  { id: "lightning", name: "Lightning", style: "lightning", rarity: "epic" },
]

export function findTrailVariant(id: string): TrailVariant | undefined {
  return TRAIL_VARIANTS.find((v) => v.id === id)
}

export function trailsByRarity(rarity: CosmeticRarity): TrailVariant[] {
  return TRAIL_VARIANTS.filter((v) => v.rarity === rarity)
}

/**
 * Draw a motion trail from older → newer world points (already screen-projected).
 * `points[0]` is oldest; last is nearest the ball.
 */
export function drawTrailStyle(
  ctx: CanvasRenderingContext2D,
  style: TrailStyle,
  points: readonly Vec2[],
  time: number,
): void {
  if (style === "none" || points.length < 2) return
  const stamp = trailStamp(style)
  if (getSprite(stamp.sprite)) {
    drawTrailStamps(ctx, stamp.sprite, points, time)
    return
  }
  switch (style) {
    case "dust":
      drawDust(ctx, points)
      break
    case "sparkle":
      drawSparkle(ctx, points, time)
      break
    case "bubbles":
      drawBubbles(ctx, points, time)
      break
    case "sage":
      drawSage(ctx, points, time)
      break
    case "hearts":
      drawHearts(ctx, points, time)
      break
    case "confetti":
      drawConfetti(ctx, points, time)
      break
    case "ribbon":
      drawRibbon(ctx, points, "#E8443A", "#FFF1D6")
      break
    case "feathers":
      drawFeathers(ctx, points, time)
      break
    case "stars":
      drawStars(ctx, points, time)
      break
    case "flame":
      drawFlame(ctx, points, time)
      break
    case "blooms":
      drawBlooms(ctx, points, time)
      break
    case "rainbow":
      drawRainbowRibbon(ctx, points, time)
      break
    case "lightning":
      drawLightning(ctx, points, time)
      break
  }
}

function drawTrailStamps(
  ctx: CanvasRenderingContext2D,
  id: string,
  points: readonly Vec2[],
  time: number,
): void {
  const frame = spriteFrame(id, time)
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const a = fade(i, points.length)
    const scale = 0.35 + (i / points.length) * 0.45
    ctx.save()
    ctx.globalAlpha *= a
    drawSprite(ctx, id, p.x, p.y, { scale, frame })
    ctx.restore()
  }
}

/** Sample arc for menu previews (screen space). */
export function previewTrailPoints(cx: number, cy: number, spread = 70): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i < 12; i++) {
    const t = i / 11
    pts.push({
      x: cx - spread + t * spread * 1.15,
      y: cy + Math.sin(t * Math.PI) * 28 - t * 8,
    })
  }
  return pts
}

function fade(i: number, n: number): number {
  return Math.max(0.08, (i + 1) / n)
}

function drawDust(ctx: CanvasRenderingContext2D, points: readonly Vec2[]): void {
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const a = fade(i, points.length) * 0.45
    ctx.fillStyle = `rgba(168, 132, 90, ${a})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2 + (i / points.length) * 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const a = fade(i, points.length)
    const twinkle = 0.5 + 0.5 * Math.sin(time * 10 + i)
    ctx.fillStyle = `rgba(250, 204, 21, ${a * twinkle})`
    const s = 2 + (i / points.length) * 2.5
    ctx.fillRect(p.x - s, p.y - 1, s * 2, 2)
    ctx.fillRect(p.x - 1, p.y - s, 2, s * 2)
  }
}

function drawBubbles(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]!
    const a = fade(i, points.length) * 0.7
    const r = 2.5 + ((i + Math.floor(time * 3)) % 3)
    ctx.strokeStyle = `rgba(56, 189, 248, ${a})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawSage(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  for (let i = 0; i < points.length; i += 2) {
    const p = points[i]!
    const a = fade(i, points.length)
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(time * 2 + i)
    ctx.fillStyle = `rgba(79, 174, 90, ${a})`
    ctx.beginPath()
    ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawFeathers(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  for (let i = 0; i < points.length; i += 2) {
    const p = points[i]!
    const a = fade(i, points.length)
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(time * 1.4 + i * 0.4)
    ctx.globalAlpha *= a
    ctx.fillStyle = "#FFF1D6"
    ctx.beginPath()
    ctx.ellipse(0, 0, 6, 2.2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#8A6A4A"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-5, 0)
    ctx.lineTo(5, 0)
    ctx.stroke()
    ctx.restore()
  }
}

function drawBlooms(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  for (let i = 0; i < points.length; i += 2) {
    const p = points[i]!
    const a = fade(i, points.length)
    const spin = time * 2 + i
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(spin)
    ctx.globalAlpha *= a
    ctx.fillStyle = i % 4 === 0 ? "#E8443A" : "#fb7185"
    for (let petal = 0; petal < 5; petal++) {
      const ang = (petal / 5) * Math.PI * 2
      ctx.beginPath()
      ctx.ellipse(Math.cos(ang) * 3, Math.sin(ang) * 3, 2.2, 1.4, ang, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = "#fde047"
    ctx.beginPath()
    ctx.arc(0, 0, 1.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawHearts(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  _time: number,
): void {
  for (let i = 0; i < points.length; i += 2) {
    const p = points[i]!
    const a = fade(i, points.length)
    const s = 3 + (i / points.length) * 2
    ctx.fillStyle = `rgba(244, 63, 94, ${a})`
    ctx.beginPath()
    ctx.moveTo(p.x, p.y + s * 0.35)
    ctx.bezierCurveTo(p.x, p.y - s * 0.2, p.x - s, p.y - s * 0.2, p.x - s, p.y + s * 0.1)
    ctx.bezierCurveTo(p.x - s, p.y + s * 0.7, p.x, p.y + s, p.x, p.y + s)
    ctx.bezierCurveTo(p.x, p.y + s, p.x + s, p.y + s * 0.7, p.x + s, p.y + s * 0.1)
    ctx.bezierCurveTo(p.x + s, p.y - s * 0.2, p.x, p.y - s * 0.2, p.x, p.y + s * 0.35)
    ctx.fill()
  }
}

function drawConfetti(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  const colors = ["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#a855f7"]
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const a = fade(i, points.length)
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(time * 4 + i)
    ctx.globalAlpha = a
    ctx.fillStyle = colors[i % colors.length]!
    ctx.fillRect(-3, -1.5, 6, 3)
    ctx.restore()
  }
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  stroke: string,
  fill: string,
): void {
  ctx.strokeStyle = stroke
  ctx.lineWidth = 5
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
  ctx.strokeStyle = fill
  ctx.lineWidth = 2.5
  ctx.globalAlpha = 0.85
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]!
    const a = fade(i, points.length)
    const tw = 0.6 + 0.4 * Math.sin(time * 8 + i * 1.7)
    ctx.fillStyle = `rgba(251, 191, 36, ${a * tw})`
    drawStar(ctx, p.x, p.y, 5, 2 + (i / points.length) * 3)
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spikes: number,
  outer: number,
): void {
  const inner = outer * 0.45
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i * Math.PI) / spikes - Math.PI / 2
    const px = x + Math.cos(a) * r
    const py = y + Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function drawFlame(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const t = i / Math.max(1, points.length - 1)
    const a = fade(i, points.length)
    const flicker = 0.85 + 0.15 * Math.sin(time * 14 + i)
    const r = 3 + t * 5
    ctx.fillStyle = `rgba(249, 115, 22, ${a * flicker * 0.7})`
    ctx.beginPath()
    ctx.ellipse(p.x, p.y, r * 0.7, r, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(250, 204, 21, ${a * flicker * 0.55})`
    ctx.beginPath()
    ctx.ellipse(p.x, p.y, r * 0.35, r * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawRainbowRibbon(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  const hues = [0, 40, 80, 140, 200, 280]
  for (let h = 0; h < hues.length; h++) {
    const hue = (hues[h]! + time * 40) % 360
    ctx.strokeStyle = `hsla(${hue}, 85%, 55%, 0.55)`
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!
      const off = (h - hues.length / 2) * 2.2
      if (i === 0) ctx.moveTo(p.x, p.y + off)
      else ctx.lineTo(p.x, p.y + off)
    }
    ctx.stroke()
  }
}

function drawLightning(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  time: number,
): void {
  const flash = 0.55 + 0.45 * Math.sin(time * 20)
  ctx.strokeStyle = `rgba(191, 219, 254, ${0.9 * flash})`
  ctx.lineWidth = 2.5
  ctx.lineJoin = "round"
  ctx.beginPath()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const jag = (i % 2 === 0 ? 1 : -1) * 5
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x + jag, p.y)
  }
  ctx.stroke()
  ctx.strokeStyle = `rgba(59, 130, 246, ${0.55 * flash})`
  ctx.lineWidth = 5
  ctx.stroke()
}
