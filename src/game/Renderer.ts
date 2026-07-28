import {
  COLORS,
  MAX_PULL,
  PLATFORM_HEIGHT,
  SLINGSHOT_FORK_HEIGHT,
} from "./constants"
import type { Ball } from "./Ball"
import type { Camera } from "./Camera"
import type { ArrowPadData, BumperData, PlatformData, PortalPair, Vec2 } from "./types"
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
    ctx.fillStyle = COLORS.skyTop
    ctx.fillRect(0, 0, width, height)

    // Soft hash for a bit of depth on white
    ctx.save()
    ctx.globalAlpha = 0.04
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
    const killY = camera.killScreenY
    for (const p of platforms) {
      const tl = camera.worldToScreen({ x: p.x, y: p.y + p.height })
      const br = camera.worldToScreen({ x: p.x + p.width, y: p.y })
      const w = br.x - tl.x
      const h = br.y - tl.y
      // Hide anything at or below the kill line
      if (tl.y >= killY || br.y < -20 || tl.y > camera.height + 20) continue

      ctx.fillStyle = p.bonus ? COLORS.platformBonus : COLORS.platform
      ctx.beginPath()
      roundRect(ctx, tl.x, tl.y, w, Math.max(PLATFORM_HEIGHT, h), 6)
      ctx.fill()

      ctx.fillStyle = p.bonus ? COLORS.platformBonusEdge : COLORS.platformEdge
      ctx.fillRect(tl.x + 4, tl.y + 3, w - 8, 3)
    }
  }

  drawBumpers(camera: Camera, bumpers: BumperData[], anim: number): void {
    const ctx = this.ctx
    const killY = camera.killScreenY
    const pulse = 0.85 + Math.sin(anim * 7) * 0.15
    for (const b of bumpers) {
      const s = camera.worldToScreen({ x: b.x, y: b.y })
      if (s.y - b.radius >= killY || s.y + b.radius < -20 || s.y - b.radius > camera.height + 20) {
        continue
      }

      ctx.save()
      ctx.globalAlpha = 0.25 * pulse
      ctx.fillStyle = COLORS.bumper
      ctx.beginPath()
      ctx.arc(s.x, s.y, b.radius + 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      const grd = ctx.createRadialGradient(
        s.x - b.radius * 0.3,
        s.y - b.radius * 0.35,
        b.radius * 0.15,
        s.x,
        s.y,
        b.radius,
      )
      grd.addColorStop(0, COLORS.bumperCore)
      grd.addColorStop(0.55, COLORS.bumper)
      grd.addColorStop(1, COLORS.bumperRim)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(s.x, s.y, b.radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = COLORS.bumperRim
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()
    }
  }

  drawArrowPads(camera: Camera, pads: ArrowPadData[], anim: number): void {
    const ctx = this.ctx
    const killY = camera.killScreenY
    const pulse = 0.9 + Math.sin(anim * 6) * 0.1
    for (const pad of pads) {
      const s = camera.worldToScreen({ x: pad.x, y: pad.y })
      if (s.y - pad.radius >= killY || s.y + pad.radius < -20 || s.y - pad.radius > camera.height + 20) {
        continue
      }

      ctx.save()
      ctx.globalAlpha = 0.2 * pulse
      ctx.fillStyle = COLORS.arrowPad
      ctx.beginPath()
      ctx.arc(s.x, s.y, pad.radius + 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      const grd = ctx.createRadialGradient(
        s.x - pad.radius * 0.25,
        s.y - pad.radius * 0.3,
        pad.radius * 0.1,
        s.x,
        s.y,
        pad.radius,
      )
      grd.addColorStop(0, COLORS.arrowPadCore)
      grd.addColorStop(0.65, COLORS.arrowPad)
      grd.addColorStop(1, COLORS.arrowPadRim)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(s.x, s.y, pad.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = COLORS.arrowPadRim
      ctx.lineWidth = 3
      ctx.stroke()

      // Arrow: dir 0 = world up = screen up (-Y). Each step is +45° clockwise in world,
      // which is also clockwise on screen after the Y flip for horizontal components.
      const angle = (pad.dir * Math.PI) / 4
      ctx.translate(s.x, s.y)
      ctx.rotate(angle)
      ctx.fillStyle = COLORS.arrow
      ctx.beginPath()
      const r = pad.radius
      ctx.moveTo(0, -r * 0.55)
      ctx.lineTo(r * 0.32, -r * 0.05)
      ctx.lineTo(r * 0.12, -r * 0.05)
      ctx.lineTo(r * 0.12, r * 0.45)
      ctx.lineTo(-r * 0.12, r * 0.45)
      ctx.lineTo(-r * 0.12, -r * 0.05)
      ctx.lineTo(-r * 0.32, -r * 0.05)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }

  drawPortals(camera: Camera, portals: PortalPair[], anim: number): void {
    const ctx = this.ctx
    const pulse = 0.55 + Math.sin(anim * 5) * 0.2
    for (const p of portals) {
      const leftTop = camera.worldToScreen({ x: 0, y: p.leftY + p.height })
      const leftBottom = camera.worldToScreen({ x: 0, y: p.leftY })
      const leftH = leftBottom.y - leftTop.y
      if (leftBottom.y >= -20 && leftTop.y <= camera.height + 20) {
        this.drawPortalPillar(ctx, 0, leftTop.y, 10, leftH, pulse, true)
      }

      const rightTop = camera.worldToScreen({ x: 0, y: p.rightY + p.height })
      const rightBottom = camera.worldToScreen({ x: 0, y: p.rightY })
      const rightH = rightBottom.y - rightTop.y
      if (rightBottom.y >= -20 && rightTop.y <= camera.height + 20) {
        this.drawPortalPillar(ctx, camera.width - 10, rightTop.y, 10, rightH, pulse, false)
      }
    }
  }

  private drawPortalPillar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    pulse: number,
    left: boolean,
  ): void {
    ctx.save()
    ctx.fillStyle = COLORS.portalGlow
    ctx.globalAlpha = pulse
    ctx.fillRect(left ? x : x - 6, y - 4, w + 6, h + 8)

    ctx.globalAlpha = 1
    const grd = ctx.createLinearGradient(x, y, x + w, y)
    if (left) {
      grd.addColorStop(0, COLORS.portal)
      grd.addColorStop(1, COLORS.portalCore)
    } else {
      grd.addColorStop(0, COLORS.portalCore)
      grd.addColorStop(1, COLORS.portal)
    }
    ctx.fillStyle = grd
    ctx.beginPath()
    roundRect(ctx, x, y, w, h, 8)
    ctx.fill()

    ctx.strokeStyle = COLORS.portal
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
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

  drawHud(camera: Camera, score: number, elapsed: number, tip: string | null): void {
    const ctx = this.ctx
    ctx.textAlign = "left"
    ctx.fillStyle = COLORS.ink
    ctx.font = "800 28px 'Bricolage Grotesque', sans-serif"
    ctx.fillText(String(score), 20, 36 + 8)

    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 12px 'DM Sans', sans-serif"
    ctx.fillText("SCORE", 20, 22)

    ctx.textAlign = "right"
    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 12px 'DM Sans', sans-serif"
    ctx.fillText("TIME", camera.width - 20, 22)
    ctx.fillStyle = COLORS.ink
    ctx.font = "800 28px 'Bricolage Grotesque', sans-serif"
    ctx.fillText(formatTime(elapsed), camera.width - 20, 36 + 8)

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

    ctx.fillStyle = COLORS.overlay
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

function formatTime(seconds: number): string {
  const total = Math.max(0, seconds)
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  const cs = Math.floor((total % 1) * 100)
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`
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
