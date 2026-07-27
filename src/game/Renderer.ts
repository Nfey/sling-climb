import {
  COLORS,
  MAX_PULL,
  PLATFORM_HEIGHT,
  SLINGSHOT_FORK_HEIGHT,
} from "./constants"
import type { Ball } from "./Ball"
import type { Camera } from "./Camera"
import type { PlatformData, Vec2 } from "./types"
import type { Slingshot } from "./Slingshot"

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private time = 0

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D not available")
    this.ctx = ctx
  }

  begin(camera: Camera, dt: number): void {
    this.time += dt
    const ctx = this.ctx
    const dpr = camera.dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, camera.width, camera.height)
    this.drawBackground(camera)
  }

  private drawBackground(camera: Camera): void {
    const ctx = this.ctx
    const { width, height } = camera
    const g = ctx.createLinearGradient(0, 0, 0, height)
    g.addColorStop(0, COLORS.skyTop)
    g.addColorStop(0.45, COLORS.skyMid)
    g.addColorStop(1, COLORS.skyBottom)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)

    // Soft vertical hash for atmosphere / depth
    ctx.save()
    ctx.globalAlpha = 0.06
    ctx.strokeStyle = COLORS.ink
    ctx.lineWidth = 1
    const offset = (this.time * 12 + camera.y * 0.15) % 28
    for (let y = -28; y < height + 28; y += 28) {
      ctx.beginPath()
      ctx.moveTo(0, y + offset)
      ctx.lineTo(width, y + offset + 8)
      ctx.stroke()
    }
    ctx.restore()

    // Reserved powerup zone below kill line
    const killY = camera.killScreenY
    ctx.fillStyle = COLORS.reserved
    ctx.fillRect(0, killY, width, height - killY)

    ctx.strokeStyle = COLORS.reservedLine
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(16, killY)
    ctx.lineTo(width - 16, killY)
    ctx.stroke()

    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 11px 'DM Sans', sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("upgrades coming soon", width / 2, killY + 28)
  }

  drawPlatforms(camera: Camera, platforms: PlatformData[]): void {
    const ctx = this.ctx
    for (const p of platforms) {
      const tl = camera.worldToScreen({ x: p.x, y: p.y + p.height })
      const br = camera.worldToScreen({ x: p.x + p.width, y: p.y })
      const w = br.x - tl.x
      const h = br.y - tl.y
      if (br.y < -20 || tl.y > camera.height + 20) continue

      ctx.fillStyle = COLORS.platform
      ctx.beginPath()
      roundRect(ctx, tl.x, tl.y, w, Math.max(PLATFORM_HEIGHT, h), 6)
      ctx.fill()

      ctx.fillStyle = COLORS.platformEdge
      ctx.fillRect(tl.x + 4, tl.y + 3, w - 8, 3)
    }
  }

  drawSlingshot(
    camera: Camera,
    sling: Slingshot,
    pouch: Vec2 | null,
    pulse = 0,
  ): void {
    const ctx = this.ctx
    const base = camera.worldToScreen(sling.base)
    const left = camera.worldToScreen(sling.leftFork)
    const right = camera.worldToScreen(sling.rightFork)
    const rest = camera.worldToScreen({ x: sling.x, y: sling.y })
    const pouchScreen = pouch ? camera.worldToScreen(pouch) : rest

    // Soft glow when ready to catch / holding
    if (pulse > 0) {
      ctx.save()
      ctx.globalAlpha = 0.25 + pulse * 0.25
      ctx.fillStyle = COLORS.accent
      ctx.beginPath()
      ctx.arc(rest.x, rest.y, 28 + pulse * 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Post
    ctx.strokeStyle = COLORS.slingshot
    ctx.lineWidth = 10
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(base.x, base.y + SLINGSHOT_FORK_HEIGHT * 0.2)
    ctx.lineTo(rest.x, rest.y + 6)
    ctx.stroke()

    // Fork arms
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(left.x, left.y)
    ctx.lineTo(rest.x, rest.y + 4)
    ctx.lineTo(right.x, right.y)
    ctx.stroke()

    // Rubber bands
    ctx.strokeStyle = COLORS.band
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(left.x, left.y)
    ctx.quadraticCurveTo(
      (left.x + pouchScreen.x) * 0.5,
      (left.y + pouchScreen.y) * 0.5 + 6,
      pouchScreen.x,
      pouchScreen.y,
    )
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(right.x, right.y)
    ctx.quadraticCurveTo(
      (right.x + pouchScreen.x) * 0.5,
      (right.y + pouchScreen.y) * 0.5 + 6,
      pouchScreen.x,
      pouchScreen.y,
    )
    ctx.stroke()

    // Movement guide line
    ctx.save()
    ctx.globalAlpha = 0.2
    ctx.strokeStyle = COLORS.ink
    ctx.lineWidth = 1
    ctx.setLineDash([6, 8])
    ctx.beginPath()
    ctx.moveTo(12, camera.slingshotScreenY)
    ctx.lineTo(camera.width - 12, camera.slingshotScreenY)
    ctx.stroke()
    ctx.restore()
  }

  drawTrajectory(
    camera: Camera,
    origin: Vec2,
    velocity: Vec2,
  ): void {
    const ctx = this.ctx
    let x = origin.x
    let y = origin.y
    let vx = velocity.x
    let vy = velocity.y
    const dt = 1 / 40
    const g = 2200

    ctx.fillStyle = COLORS.trajectory
    for (let i = 0; i < 18; i++) {
      vy -= g * dt
      x += vx * dt
      y += vy * dt
      const s = camera.worldToScreen({ x, y })
      if (s.y > camera.killScreenY) break
      const r = Math.max(1.5, 3.5 - i * 0.12)
      ctx.globalAlpha = Math.max(0.15, 0.9 - i * 0.045)
      ctx.beginPath()
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  drawBall(camera: Camera, ball: Ball): void {
    const ctx = this.ctx
    const s = camera.worldToScreen({ x: ball.x, y: ball.y })
    const squash = ball.squash
    const scaleX = 1 + squash * 0.25
    const scaleY = 1 - squash * 0.2

    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.scale(scaleX, scaleY)

    const grd = ctx.createRadialGradient(-4, -5, 2, 0, 0, ball.radius)
    grd.addColorStop(0, "#fff6dd")
    grd.addColorStop(0.55, COLORS.ball)
    grd.addColorStop(1, COLORS.ballStroke)
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = "rgba(90, 60, 30, 0.25)"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }

  drawHud(camera: Camera, score: number, tip: string | null): void {
    const ctx = this.ctx
    ctx.textAlign = "left"
    ctx.fillStyle = COLORS.ink
    ctx.font = "800 28px 'Bricolage Grotesque', sans-serif"
    ctx.fillText(String(score), 20, 36 + 8)

    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 12px 'DM Sans', sans-serif"
    ctx.fillText("SCORE", 20, 22)

    if (tip) {
      ctx.textAlign = "center"
      ctx.fillStyle = COLORS.inkDim
      ctx.font = "500 14px 'DM Sans', sans-serif"
      const y = camera.slingshotScreenY - 56
      ctx.fillText(tip, camera.width / 2, y)
    }
  }

  drawTitle(camera: Camera): void {
    const ctx = this.ctx
    ctx.textAlign = "center"
    ctx.fillStyle = COLORS.ink
    ctx.font = "800 42px 'Bricolage Grotesque', sans-serif"
    ctx.fillText("Sling Climb", camera.width / 2, camera.slingshotScreenY - 120)

    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 15px 'DM Sans', sans-serif"
    ctx.fillText("Pull back to launch · catch to climb", camera.width / 2, camera.slingshotScreenY - 88)
  }

  drawGameOver(camera: Camera, score: number, highScore: number): void {
    const ctx = this.ctx
    const { width } = camera
    const cy = camera.slingshotScreenY - 40

    ctx.fillStyle = "rgba(10, 16, 14, 0.55)"
    ctx.fillRect(0, 0, width, camera.killScreenY)

    ctx.textAlign = "center"
    ctx.fillStyle = COLORS.ink
    ctx.font = "800 36px 'Bricolage Grotesque', sans-serif"
    ctx.fillText("Game Over", width / 2, cy - 40)

    ctx.font = "800 52px 'Bricolage Grotesque', sans-serif"
    ctx.fillStyle = COLORS.accent
    ctx.fillText(String(score), width / 2, cy + 24)

    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 14px 'DM Sans', sans-serif"
    ctx.fillText("SCORE", width / 2, cy - 4)
    ctx.fillText(`Best ${highScore}`, width / 2, cy + 52)

    ctx.fillStyle = COLORS.ink
    ctx.font = "600 16px 'DM Sans', sans-serif"
    ctx.fillText("Tap to play again", width / 2, cy + 96)
  }

  /** Helper for aim pouch offset in world space from pull. */
  static pouchFromPull(sling: Slingshot, pull: Vec2): Vec2 {
    const len = Math.hypot(pull.x, pull.y)
    const clamped = Math.min(len, MAX_PULL)
    if (len < 0.001) return { x: sling.x, y: sling.y }
    return {
      x: sling.x + (pull.x / len) * clamped,
      y: sling.y + (pull.y / len) * clamped,
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
