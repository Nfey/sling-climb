import {
  COLORS,
  HEIGHT_MARKER_SPACING,
  MAX_PULL,
  PLATFORM_HEIGHT,
  SCORE_POPUP_RISE,
  SKY_ZONE_SPACING,
  SLINGSHOT_FORK_HEIGHT,
  skyZoneColor,
} from "./constants"
import type { Ball } from "./Ball"
import type { Camera } from "./Camera"
import type {
  ArrowPadData,
  BulletData,
  BumperData,
  PlatformData,
  PortalData,
  ScorePopup,
  UpgradePickupData,
  Vec2,
} from "./types"
import type { Slingshot } from "./Slingshot"

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private time = 0

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D not available")
    this.ctx = ctx
  }

  begin(camera: Camera, dt: number, startHeight: number): void {
    this.time += dt
    const ctx = this.ctx
    const dpr = camera.dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, camera.width, camera.height)
    this.drawBackground(camera, startHeight)
  }

  private drawBackground(camera: Camera, startHeight: number): void {
    const ctx = this.ctx
    const { width, height } = camera
    const killY = camera.killScreenY
    this.drawSkyBands(camera, startHeight, killY)

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
    ctx.fillStyle = COLORS.reserved
    ctx.fillRect(0, killY, width, height - killY)

    ctx.strokeStyle = COLORS.reservedLine
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(16, killY)
    ctx.lineTo(width - 16, killY)
    ctx.stroke()

  }

  /** Horizontal sky fills keyed to 5k climb bands (repeats every 100k). */
  private drawSkyBands(
    camera: Camera,
    startHeight: number,
    killY: number,
  ): void {
    const ctx = this.ctx
    const { width } = camera
    const topWorld = camera.screenToWorld(0, -24).y
    const bottomWorld = camera.screenToWorld(0, killY + 24).y
    const climbMin = Math.min(topWorld, bottomWorld) - startHeight
    const climbMax = Math.max(topWorld, bottomWorld) - startHeight
    const spacing = SKY_ZONE_SPACING

    let climb = Math.floor(climbMin / spacing) * spacing
    for (; climb <= climbMax + spacing; climb += spacing) {
      const worldLow = startHeight + climb
      const worldHigh = startHeight + climb + spacing
      const syTop = camera.worldToScreen({ x: 0, y: worldHigh }).y
      const syBottom = camera.worldToScreen({ x: 0, y: worldLow }).y
      const y0 = Math.max(0, syTop)
      const y1 = Math.min(killY, syBottom)
      if (y1 <= y0) continue

      ctx.fillStyle = skyZoneColor(climb)
      ctx.fillRect(0, y0, width, y1 - y0)
    }
  }

  /**
   * Dashed altitude lines with left-side height marks (climb above run start).
   * Drawn early so gameplay sits on top.
   */
  drawAltitudeMarkers(camera: Camera, startHeight: number): void {
    const ctx = this.ctx
    const topWorld = camera.screenToWorld(0, -40).y
    const bottomWorld = camera.screenToWorld(0, camera.killScreenY + 20).y
    const climbBottom = bottomWorld - startHeight
    const climbTop = topWorld - startHeight
    const spacing = HEIGHT_MARKER_SPACING
    let climb = Math.ceil(climbBottom / spacing) * spacing
    if (climb <= 0) climb = spacing

    ctx.save()
    for (; climb <= climbTop; climb += spacing) {
      const worldY = startHeight + climb
      const sy = camera.worldToScreen({ x: 0, y: worldY }).y
      if (sy > camera.killScreenY || sy < 56) continue

      ctx.strokeStyle = COLORS.heightMarker
      ctx.lineWidth = 1
      ctx.setLineDash([5, 7])
      ctx.beginPath()
      ctx.moveTo(36, sy)
      ctx.lineTo(camera.width - 12, sy)
      ctx.stroke()
      ctx.setLineDash([])

      // Tick mark on the left
      ctx.beginPath()
      ctx.moveTo(8, sy)
      ctx.lineTo(28, sy)
      ctx.stroke()

      ctx.fillStyle = COLORS.heightMarkerLabel
      ctx.font = "600 11px 'DM Sans', sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText(formatHeightLabel(climb), 8, sy - 10)
    }
    ctx.textBaseline = "alphabetic"
    ctx.restore()
  }

  /**
   * Solid line at the previous-run max height.
   * Blue until the player passes it this run, then green. Fixed for the run.
   */
  drawMaxHeightLine(
    camera: Camera,
    worldY: number,
    passed: boolean,
  ): void {
    if (worldY <= 0) return
    const ctx = this.ctx
    const sy = camera.worldToScreen({ x: 0, y: worldY }).y
    if (sy < -20 || sy > camera.killScreenY + 10) return

    const color = passed ? COLORS.maxHeightLinePassed : COLORS.maxHeightLine

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(12, sy)
    ctx.lineTo(camera.width - 12, sy)
    ctx.stroke()

    ctx.fillStyle = color
    ctx.font = "700 11px 'DM Sans', sans-serif"
    ctx.textAlign = "right"
    ctx.textBaseline = "bottom"
    ctx.fillText(passed ? "BEST ✓" : "BEST", camera.width - 14, sy - 4)
    ctx.textBaseline = "alphabetic"
    ctx.restore()
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

  drawPortals(camera: Camera, portals: PortalData[], anim: number): void {
    const ctx = this.ctx
    const pulse = 0.55 + Math.sin(anim * 5) * 0.2
    for (const p of portals) {
      const top = camera.worldToScreen({ x: 0, y: p.y + p.height })
      const bottom = camera.worldToScreen({ x: 0, y: p.y })
      const h = bottom.y - top.y
      if (bottom.y < -20 || top.y > camera.height + 20) continue
      if (p.side === "left") {
        this.drawPortalPillar(ctx, 0, top.y, 10, h, pulse, true)
      } else {
        this.drawPortalPillar(ctx, camera.width - 10, top.y, 10, h, pulse, false)
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
    style: "normal" | "freeMove" | "pow" = "normal",
  ): void {
    const ctx = this.ctx
    const base = camera.worldToScreen(sling.base)
    const left = camera.worldToScreen(sling.leftFork)
    const right = camera.worldToScreen(sling.rightFork)
    const rest = camera.worldToScreen({ x: sling.x, y: sling.y })
    const pouchScreen = pouch ? camera.worldToScreen(pouch) : rest
    const freeMove = style === "freeMove"
    const pow = style === "pow"
    const body = pow ? COLORS.powPickup : COLORS.slingshot
    const band = pow ? "#991b1b" : COLORS.band
    const glow = freeMove
      ? COLORS.freeMovePickup
      : pow
        ? COLORS.powPickup
        : COLORS.accent

    // Soft glow when ready to catch / holding / powered
    if (pulse > 0 || freeMove || pow) {
      ctx.save()
      ctx.globalAlpha = freeMove || pow
        ? 0.22 + Math.sin(this.time * 5) * 0.08
        : 0.25 + pulse * 0.25
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(rest.x, rest.y, 28 + (freeMove || pow ? 6 : pulse * 8), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Post
    ctx.strokeStyle = body
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
    ctx.strokeStyle = band
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

    // Movement guide — follows the slingshot (important during free-move)
    ctx.save()
    ctx.globalAlpha = freeMove ? 0.28 : pow ? 0.26 : 0.2
    ctx.strokeStyle = freeMove
      ? COLORS.freeMovePickup
      : pow
        ? COLORS.powPickup
        : COLORS.ink
    ctx.lineWidth = 1
    ctx.setLineDash(freeMove || pow ? [4, 6] : [6, 8])
    ctx.beginPath()
    ctx.moveTo(12, rest.y)
    ctx.lineTo(camera.width - 12, rest.y)
    ctx.stroke()
    ctx.restore()
  }

  /** Expanding rings + flash when the ball is caught. `t` is 1→0 over the burst. */
  drawCatchBurst(camera: Camera, sling: Slingshot, t: number): void {
    const ctx = this.ctx
    const rest = camera.worldToScreen({ x: sling.x, y: sling.y })
    const progress = 1 - Math.max(0, Math.min(1, t))
    const alpha = Math.max(0, t)

    ctx.save()
    // Bright core flash
    ctx.globalAlpha = 0.35 * alpha
    ctx.fillStyle = COLORS.accent
    ctx.beginPath()
    ctx.arc(rest.x, rest.y, 18 + progress * 10, 0, Math.PI * 2)
    ctx.fill()

    // Expanding rings
    for (let i = 0; i < 3; i++) {
      const ringT = Math.max(0, progress - i * 0.12)
      const r = 20 + ringT * (48 + i * 18)
      ctx.globalAlpha = alpha * (0.85 - i * 0.22) * (1 - ringT)
      ctx.strokeStyle = COLORS.accent
      ctx.lineWidth = 3.5 - i * 0.6
      ctx.beginPath()
      ctx.arc(rest.x, rest.y, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    // "Caught!" label
    ctx.globalAlpha = Math.min(1, alpha * 1.4)
    ctx.fillStyle = COLORS.ink
    ctx.font = "800 22px 'Bricolage Grotesque', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("Caught!", rest.x, rest.y - 52 - progress * 10)
    ctx.textBaseline = "alphabetic"
    ctx.restore()
  }

  /** Purple "+100" that rises and fades above a bonus platform. */
  drawScorePopups(camera: Camera, popups: ScorePopup[]): void {
    if (popups.length === 0) return
    const ctx = this.ctx
    ctx.save()
    ctx.font = "800 18px 'Bricolage Grotesque', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    for (const popup of popups) {
      const t = Math.max(0, Math.min(1, popup.life / popup.duration))
      const rise = (1 - t) * SCORE_POPUP_RISE
      const s = camera.worldToScreen({ x: popup.x, y: popup.y + rise })
      ctx.globalAlpha = Math.min(1, t * 1.35)
      ctx.fillStyle = popup.color
      ctx.fillText(popup.text, s.x, s.y)
    }
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
    if (ball.isBonus) {
      grd.addColorStop(0, "#f5f3ff")
      grd.addColorStop(0.55, COLORS.ballPurple)
      grd.addColorStop(1, COLORS.ballPurpleStroke)
    } else {
      grd.addColorStop(0, "#fff6dd")
      grd.addColorStop(0.55, COLORS.ball)
      grd.addColorStop(1, COLORS.ballStroke)
    }
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = ball.isBonus ? "rgba(76, 29, 149, 0.35)" : "rgba(90, 60, 30, 0.25)"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }

  drawHud(
    camera: Camera,
    score: number,
    climbHeight: number,
    tip: string | null,
    combo = 1,
    highScore = 0,
    bestHeight = 0,
  ): void {
    const ctx = this.ctx
    const scoreY = 52
    const bestRowY = 36

    ctx.textAlign = "left"
    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 12px 'DM Sans', sans-serif"
    ctx.fillText("SCORE", 20, 22)

    if (highScore > 0) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "600 11px 'DM Sans', sans-serif"
      ctx.fillText(String(highScore), 20, bestRowY)
    }

    ctx.fillStyle = COLORS.ink
    ctx.font = "800 28px 'Bricolage Grotesque', sans-serif"
    ctx.fillText(String(score), 20, scoreY)

    if (combo >= 2) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "800 20px 'Bricolage Grotesque', sans-serif"
      ctx.fillText(`${combo}x`, 20, scoreY + 26)
    }

    ctx.textAlign = "right"
    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 12px 'DM Sans', sans-serif"
    ctx.fillText("HEIGHT", camera.width - 20, 22)

    if (bestHeight > 0) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "600 11px 'DM Sans', sans-serif"
      ctx.fillText(formatHeightLabel(bestHeight), camera.width - 20, bestRowY)
    }

    ctx.fillStyle = COLORS.ink
    ctx.font = "800 28px 'Bricolage Grotesque', sans-serif"
    ctx.fillText(formatHeightLabel(climbHeight), camera.width - 20, scoreY)

    if (tip) {
      ctx.textAlign = "center"
      ctx.fillStyle = COLORS.inkDim
      ctx.font = "500 14px 'DM Sans', sans-serif"
      const y = camera.slingshotScreenY - 56
      ctx.fillText(tip, camera.width / 2, y)
    }
  }

  drawUpgradePickups(camera: Camera, pickups: UpgradePickupData[], anim: number): void {
    const ctx = this.ctx
    const killY = camera.killScreenY
    const bob = Math.sin(anim * 4) * 3
    for (const u of pickups) {
      const s = camera.worldToScreen({ x: u.x, y: u.y })
      s.y += bob
      if (s.y - u.radius >= killY || s.y + u.radius < -20) continue

      const isBullets = u.kind === "bullets"
      const isFreeMove = u.kind === "freeMove"
      const isPow = u.kind === "pow"
      const fill = isBullets
        ? COLORS.bulletPickupCore
        : isFreeMove
          ? COLORS.freeMovePickupCore
          : isPow
            ? COLORS.powPickupCore
            : COLORS.upgradePickupCore
      const stroke = isBullets
        ? COLORS.bulletPickup
        : isFreeMove
          ? COLORS.freeMovePickup
          : isPow
            ? COLORS.powPickup
            : COLORS.upgradePickup
      const label = isBullets ? "•••" : isFreeMove ? "XY" : isPow ? "POW" : "2x"
      ctx.save()
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.arc(s.x, s.y, u.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = stroke
      ctx.font =
        isBullets || isFreeMove || isPow
          ? "800 12px 'Bricolage Grotesque', sans-serif"
          : "800 16px 'Bricolage Grotesque', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(label, s.x, s.y + 1)
      ctx.textBaseline = "alphabetic"
      ctx.restore()
    }
  }

  drawBullets(camera: Camera, bullets: BulletData[]): void {
    const ctx = this.ctx
    for (const b of bullets) {
      const s = camera.worldToScreen({ x: b.x, y: b.y })
      if (s.y < -20 || s.y > camera.height + 20) continue
      ctx.save()
      const grd = ctx.createRadialGradient(s.x - 1, s.y - 1, 0.5, s.x, s.y, b.radius)
      grd.addColorStop(0, COLORS.bulletCore)
      grd.addColorStop(1, COLORS.bullet)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(s.x, s.y, b.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
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

  drawGameOver(
    camera: Camera,
    score: number,
    highScore: number,
    isNewHighScore = false,
    climbHeight: number,
    bestHeight: number,
    isNewBestHeight = false,
    anim = 0,
  ): void {
    const ctx = this.ctx
    const { width } = camera
    const cx = width / 2
    const showBanner = isNewHighScore || isNewBestHeight
    // Stack from top so banner / title / score never collide
    let y = camera.slingshotScreenY - (showBanner ? 148 : 110)

    ctx.fillStyle = COLORS.overlay
    ctx.fillRect(0, 0, width, camera.killScreenY)

    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    ctx.fillStyle = COLORS.ink
    ctx.font = "800 36px 'Bricolage Grotesque', sans-serif"
    ctx.fillText("Game Over", cx, y)
    y += 48

    if (showBanner) {
      const pulse = 0.75 + Math.sin(anim * 7) * 0.25
      const banner = isNewHighScore && isNewBestHeight
        ? "NEW BEST SCORE & HEIGHT!"
        : isNewHighScore
          ? "NEW HIGH SCORE!"
          : "NEW HEIGHT RECORD!"
      ctx.save()
      ctx.globalAlpha = 0.16 * pulse
      ctx.fillStyle = COLORS.accent
      ctx.beginPath()
      roundRect(ctx, cx - 148, y - 18, 296, 36, 10)
      ctx.fill()
      ctx.globalAlpha = pulse
      ctx.fillStyle = COLORS.accent
      ctx.font = "800 18px 'Bricolage Grotesque', sans-serif"
      ctx.fillText(banner, cx, y)
      ctx.restore()
      y += 48
    }

    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 13px 'DM Sans', sans-serif"
    ctx.fillText("SCORE", cx, y)
    y += 38

    ctx.fillStyle = COLORS.accent
    ctx.font = "800 52px 'Bricolage Grotesque', sans-serif"
    ctx.fillText(String(score), cx, y)
    y += 36

    if (isNewHighScore) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "700 14px 'DM Sans', sans-serif"
      ctx.fillText("New best!", cx, y)
    } else if (highScore > 0) {
      ctx.fillStyle = COLORS.inkDim
      ctx.font = "500 14px 'DM Sans', sans-serif"
      ctx.fillText(`Best ${highScore}`, cx, y)
    }
    y += 40

    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 13px 'DM Sans', sans-serif"
    ctx.fillText("HEIGHT", cx, y)
    y += 32

    ctx.fillStyle = COLORS.ink
    ctx.font = "800 36px 'Bricolage Grotesque', sans-serif"
    ctx.fillText(formatHeightLabel(climbHeight), cx, y)
    y += 28

    if (isNewBestHeight) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "700 14px 'DM Sans', sans-serif"
      ctx.fillText("New best!", cx, y)
    } else if (bestHeight > 0) {
      ctx.fillStyle = COLORS.inkDim
      ctx.font = "500 14px 'DM Sans', sans-serif"
      ctx.fillText(`Best ${formatHeightLabel(bestHeight)}`, cx, y)
    }
    y += 44

    ctx.fillStyle = COLORS.ink
    ctx.font = "600 16px 'DM Sans', sans-serif"
    ctx.fillText("Tap to play again", cx, y)

    ctx.textBaseline = "alphabetic"
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

/** Compact altitude label for HUD and left-side marks (climb px above start). */
function formatHeightLabel(climb: number): string {
  if (climb >= 1000) {
    const k = climb / 1000
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`
  }
  return String(Math.round(climb))
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
