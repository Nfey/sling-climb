import {
  COLORS,
  HEIGHT_MARKER_SPACING,
  MAX_PULL,
  MILESTONE_COLORS,
  PLATFORM_HEIGHT,
  SCORE_POPUP_RISE,
  SKY_ZONE_SPACING,
  SLINGSHOT_FORK_HEIGHT,
  TURRET_BARREL_LENGTH,
  TURRET_BARREL_WIDTH,
  TURRET_BODY_RADIUS,
  skyZoneColor,
} from "./constants"
import type { Ball } from "./Ball"
import type { Camera } from "./Camera"
import type {
  ArrowPadData,
  BulletData,
  BumperData,
  CoinData,
  MainMenuHitAreas,
  PlatformData,
  PortalData,
  ScorePopup,
  ScreenRect,
  TurretShotData,
  UpgradePickupData,
  Vec2,
  WallTurretData,
} from "./types"
import type { Slingshot } from "./Slingshot"
import type { BallStyle, BackgroundStyle, SlingshotStyle } from "./cosmetics"
import {
  drawBallStyle,
  drawSlingshotBands,
  drawSlingshotFork,
  drawSlingshotIconStyle,
  slingshotAccentColor,
} from "./cosmeticArt"
import { drawBackgroundPreview, drawBackgroundStyle } from "./backgroundArt"
import { getBackgroundTheme } from "./backgrounds"

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private time = 0
  private currentBackgroundStyle: BackgroundStyle = "classic"

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D not available")
    this.ctx = ctx
  }

  begin(camera: Camera, dt: number, startHeight: number, backgroundStyle: BackgroundStyle = "classic"): void {
    this.currentBackgroundStyle = backgroundStyle
    this.time += dt
    const ctx = this.ctx
    const dpr = camera.dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, camera.width, camera.height)
    this.drawBackground(camera, startHeight, backgroundStyle)
  }

  private drawBackground(camera: Camera, startHeight: number, backgroundStyle: BackgroundStyle): void {
    const ctx = this.ctx
    const { width, height } = camera
    const killY = camera.killScreenY
    const theme = getBackgroundTheme(backgroundStyle)

    if (backgroundStyle === "classic") {
      this.drawSkyBands(camera, startHeight, height)

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
    } else {
      drawBackgroundStyle(ctx, camera, backgroundStyle, this.time, height)
    }

    ctx.strokeStyle = theme.dividerLine
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
    bgHeight: number,
  ): void {
    const ctx = this.ctx
    const { width } = camera
    const topWorld = camera.screenToWorld(0, -24).y
    const bottomWorld = camera.screenToWorld(0, bgHeight + 24).y
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
      const y1 = Math.min(bgHeight, syBottom)
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
    const theme = getBackgroundTheme(this.currentBackgroundStyle)
    for (; climb <= climbTop; climb += spacing) {
      const worldY = startHeight + climb
      const sy = camera.worldToScreen({ x: 0, y: worldY }).y
      if (sy > camera.killScreenY || sy < 56) continue

      ctx.strokeStyle = theme.heightMarker
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

      ctx.fillStyle = theme.heightMarkerLabel
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

  /**
   * Dashed lines at 2×, 3×, … multiples of the previous best height.
   * Each turns green once the player passes it. Colors cycle every 10.
   */
  drawMilestoneHeightLines(
    camera: Camera,
    milestones: { worldY: number; label: string; passed: boolean; colorIndex: number }[],
  ): void {
    const ctx = this.ctx
    ctx.save()
    ctx.lineWidth = 2
    ctx.setLineDash([8, 5])
    ctx.font = "700 11px 'DM Sans', sans-serif"
    ctx.textAlign = "right"
    ctx.textBaseline = "bottom"
    for (const m of milestones) {
      const sy = camera.worldToScreen({ x: 0, y: m.worldY }).y
      if (sy < -20 || sy > camera.killScreenY + 10) continue
      const unpassed = MILESTONE_COLORS[m.colorIndex % MILESTONE_COLORS.length]!
      const color = m.passed ? COLORS.milestoneLinePassed : unpassed
      ctx.strokeStyle = color
      ctx.beginPath()
      ctx.moveTo(12, sy)
      ctx.lineTo(camera.width - 12, sy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = color
      ctx.fillText(m.passed ? `${m.label} ✓` : m.label, camera.width - 14, sy - 4)
      ctx.setLineDash([8, 5])
    }
    ctx.setLineDash([])
    ctx.textBaseline = "alphabetic"
    ctx.restore()
  }

  drawPlatforms(camera: Camera, platforms: PlatformData[]): void {
    const ctx = this.ctx
    const killY = camera.killScreenY
    for (const p of platforms) {
      if (p.active === false) continue
      const tl = camera.worldToScreen({ x: p.x, y: p.y + p.height })
      const br = camera.worldToScreen({ x: p.x + p.width, y: p.y })
      const w = br.x - tl.x
      const h = br.y - tl.y
      // Hide anything at or below the kill line
      if (tl.y >= killY || br.y < -20 || tl.y > camera.height + 20) continue

      let fill = COLORS.platform
      let edge = COLORS.platformEdge
      if (p.kind === "bonus") {
        fill = COLORS.platformBonus
        edge = COLORS.platformBonusEdge
      } else if (p.kind === "crumbling") {
        fill = COLORS.platformCrumbling
        edge = COLORS.platformCrumblingEdge
      } else if (p.kind === "moving") {
        fill = COLORS.platformMoving
        edge = COLORS.platformMovingEdge
      }

      ctx.fillStyle = fill
      ctx.beginPath()
      roundRect(ctx, tl.x, tl.y, w, Math.max(PLATFORM_HEIGHT, h), 6)
      ctx.fill()

      ctx.fillStyle = edge
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

  drawWallTurrets(camera: Camera, turrets: WallTurretData[], anim: number): void {
    const ctx = this.ctx
    for (const t of turrets) {
      const centerX =
        t.side === "left" ? TURRET_BODY_RADIUS : camera.width - TURRET_BODY_RADIUS
      const s = camera.worldToScreen({ x: centerX, y: t.y })
      if (s.y < -40 || s.y > camera.height + 40) continue

      const r = TURRET_BODY_RADIUS

      ctx.save()
      ctx.translate(s.x, s.y)

      // Half-circle body flush against the wall
      ctx.fillStyle = COLORS.turret
      ctx.strokeStyle = COLORS.turretRim
      ctx.lineWidth = 2
      ctx.beginPath()
      if (t.side === "left") {
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2)
      } else {
        ctx.arc(0, 0, r, Math.PI / 2, (Math.PI * 3) / 2)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Barrel — flat rectangle pivoted from the semicircle edge in 2D
      ctx.save()
      ctx.rotate(t.side === "left" ? t.aimAngle : Math.PI - t.aimAngle)
      ctx.fillStyle = COLORS.turretBarrel
      ctx.fillRect(r, -TURRET_BARREL_WIDTH * 0.5, TURRET_BARREL_LENGTH, TURRET_BARREL_WIDTH)
      ctx.strokeStyle = COLORS.turretRim
      ctx.strokeRect(r, -TURRET_BARREL_WIDTH * 0.5, TURRET_BARREL_LENGTH, TURRET_BARREL_WIDTH)
      ctx.restore()

      // Muzzle glow when near firing
      const muzzleAngle = t.side === "left" ? t.aimAngle : Math.PI - t.aimAngle
      const tipX = Math.cos(muzzleAngle) * (r + TURRET_BARREL_LENGTH)
      const tipY = Math.sin(muzzleAngle) * (r + TURRET_BARREL_LENGTH)
      if (t.fireCooldown < 0.25) {
        ctx.fillStyle = COLORS.turretShot
        ctx.globalAlpha = 0.35 + Math.sin(anim * 18) * 0.15
        ctx.beginPath()
        ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  }

  drawTurretShots(camera: Camera, shots: TurretShotData[]): void {
    const ctx = this.ctx
    for (const shot of shots) {
      const s = camera.worldToScreen({ x: shot.x, y: shot.y })
      if (s.y < -20 || s.y > camera.height + 20) continue
      ctx.save()
      const grd = ctx.createRadialGradient(
        s.x - 1,
        s.y - 1,
        0.5,
        s.x,
        s.y,
        shot.radius,
      )
      grd.addColorStop(0, COLORS.turretShotCore)
      grd.addColorStop(1, COLORS.turretShot)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(s.x, s.y, shot.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  drawSlingshot(
    camera: Camera,
    sling: Slingshot,
    pouch: Vec2 | null,
    pulse = 0,
    style: "normal" | "freeMove" | "pow" = "normal",
    cosmeticStyle: SlingshotStyle = "classic",
  ): void {
    const ctx = this.ctx
    const base = camera.worldToScreen(sling.base)
    const left = camera.worldToScreen(sling.leftFork)
    const right = camera.worldToScreen(sling.rightFork)
    const rest = camera.worldToScreen({ x: sling.x, y: sling.y })
    const pouchScreen = pouch ? camera.worldToScreen(pouch) : rest
    const freeMove = style === "freeMove"
    const pow = style === "pow"
    const slingStyle = pow || freeMove ? "classic" : cosmeticStyle
    const glow = freeMove
      ? COLORS.freeMovePickup
      : pow
        ? COLORS.powPickup
        : slingshotAccentColor(slingStyle, this.time)

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

    const geom = {
      base: { x: base.x, y: base.y + SLINGSHOT_FORK_HEIGHT * 0.2 },
      left: { x: left.x, y: left.y },
      right: { x: right.x, y: right.y },
      rest: { x: rest.x, y: rest.y },
    }

    if (pow) {
      drawSlingshotFork(ctx, geom, "crimson", this.time, 10, 8)
    } else {
      drawSlingshotFork(ctx, geom, slingStyle, this.time, 10, 8)
    }

    if (!pow) {
      drawSlingshotBands(
        ctx,
        left,
        right,
        pouchScreen,
        slingStyle,
        this.time,
        3.5,
      )
    } else {
      ctx.strokeStyle = "#991b1b"
      ctx.lineWidth = 3.5
      ctx.lineCap = "round"
      for (const tip of [left, right]) {
        ctx.beginPath()
        ctx.moveTo(tip.x, tip.y)
        ctx.quadraticCurveTo(
          (tip.x + pouchScreen.x) * 0.5,
          (tip.y + pouchScreen.y) * 0.5 + 6,
          pouchScreen.x,
          pouchScreen.y,
        )
        ctx.stroke()
      }
    }

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

  drawBall(camera: Camera, ball: Ball, ballStyle: BallStyle = "classic"): void {
    const ctx = this.ctx
    const s = camera.worldToScreen({ x: ball.x, y: ball.y })
    const squash = ball.squash
    const scaleX = 1 + squash * 0.25
    const scaleY = 1 - squash * 0.2

    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.scale(scaleX, scaleY)

    if (ball.isBonus) {
      const grd = ctx.createRadialGradient(-4, -5, 2, 0, 0, ball.radius)
      grd.addColorStop(0, "#f5f3ff")
      grd.addColorStop(0.55, COLORS.ballPurple)
      grd.addColorStop(1, COLORS.ballPurpleStroke)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "rgba(76, 29, 149, 0.35)"
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      drawBallStyle(ctx, ballStyle, ball.radius, this.time, "lighting")
      ctx.rotate(ball.spin)
      drawBallStyle(ctx, ballStyle, ball.radius, this.time, "pattern")
    }
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
    const theme = getBackgroundTheme(this.currentBackgroundStyle)
    // Clear the iOS status bar / notch (viewport-fit=cover).
    const top = safeAreaInsetTop()
    const labelY = 22 + top
    const bestRowY = 36 + top
    const scoreY = 62 + top

    ctx.textAlign = "left"
    ctx.fillStyle = theme.inkDim
    ctx.font = "500 12px 'DM Sans', sans-serif"
    ctx.fillText("SCORE", 20, labelY)

    if (highScore > 0) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "600 11px 'DM Sans', sans-serif"
      ctx.fillText(String(highScore), 20, bestRowY)
    }

    ctx.fillStyle = theme.ink
    ctx.font = "800 28px 'Bricolage Grotesque', sans-serif"
    ctx.fillText(String(score), 20, scoreY)

    if (combo >= 2) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "800 20px 'Bricolage Grotesque', sans-serif"
      ctx.fillText(`${combo}x`, 20, scoreY + 26)
    }

    ctx.textAlign = "right"
    ctx.fillStyle = theme.inkDim
    ctx.font = "500 12px 'DM Sans', sans-serif"
    ctx.fillText("HEIGHT", camera.width - 20, labelY)

    if (bestHeight > 0) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "600 11px 'DM Sans', sans-serif"
      ctx.fillText(formatHeightLabel(bestHeight), camera.width - 20, bestRowY)
    }

    ctx.fillStyle = theme.ink
    ctx.font = "800 28px 'Bricolage Grotesque', sans-serif"
    ctx.fillText(formatHeightLabel(climbHeight), camera.width - 20, scoreY)

    if (tip) {
      ctx.textAlign = "center"
      ctx.fillStyle = theme.inkDim
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

  drawCoins(camera: Camera, coins: CoinData[], anim: number): void {
    const ctx = this.ctx
    const killY = camera.killScreenY
    const bob = Math.sin(anim * 5) * 2.5
    for (const c of coins) {
      const s = camera.worldToScreen({ x: c.x, y: c.y })
      s.y += bob
      if (s.y - c.radius >= killY || s.y + c.radius < -20) continue

      ctx.save()
      const grd = ctx.createRadialGradient(
        s.x - c.radius * 0.35,
        s.y - c.radius * 0.4,
        1,
        s.x,
        s.y,
        c.radius,
      )
      grd.addColorStop(0, COLORS.coinCore)
      grd.addColorStop(0.55, COLORS.coin)
      grd.addColorStop(1, COLORS.coinRim)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(s.x, s.y, c.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = COLORS.coinRim
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = COLORS.coinRim
      ctx.font = "800 14px 'Bricolage Grotesque', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("$", s.x, s.y + 0.5)
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

  /**
   * Title screen with bests, bottom-corner variant pickers, and a Play button.
   * Returns interactive regions for hit-testing.
   */
  drawMainMenu(
    camera: Camera,
    highScore: number,
    bestHeight: number,
    lifetimeCoins: number,
    anim: number,
    slingshotStyle: SlingshotStyle,
    backgroundStyle: BackgroundStyle,
    ballStyle: BallStyle,
    slingshotLocked: boolean,
    backgroundLocked: boolean,
    ballLocked: boolean,
    slingshotPrice: number | null,
    backgroundPrice: number | null,
    backgroundUnlockHint: string | null,
    ballUnlockHint: string | null,
  ): MainMenuHitAreas {
    const ctx = this.ctx
    const { width, height } = camera
    const cx = width / 2
    const theme = getBackgroundTheme(backgroundStyle)
    let y = camera.slingshotScreenY - 168

    ctx.fillStyle = theme.menuOverlay
    ctx.fillRect(0, 0, width, camera.killScreenY)

    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    ctx.fillStyle = theme.ink
    ctx.font = "800 44px 'Bricolage Grotesque', sans-serif"
    ctx.fillText("Sling Climb", cx, y)
    y += 36

    ctx.fillStyle = theme.inkDim
    ctx.font = "500 15px 'DM Sans', sans-serif"
    ctx.fillText("Pull back to launch · catch to climb", cx, y)
    y += 40

    const showBests = highScore > 0 || bestHeight > 0

    if (showBests || lifetimeCoins >= 0) {
      const rowW = Math.min(280, width - 48)
      const rowX = cx - rowW / 2
      const rowH = showBests ? 96 : 52
      ctx.fillStyle = theme.statsCard
      ctx.beginPath()
      roundRect(ctx, rowX, y - 22, rowW, rowH, 12)
      ctx.fill()

      if (showBests) {
        const leftX = rowX + rowW * 0.28
        const rightX = rowX + rowW * 0.72

        ctx.fillStyle = theme.inkDim
        ctx.font = "500 11px 'DM Sans', sans-serif"
        ctx.fillText("BEST SCORE", leftX, y - 8)
        ctx.fillText("BEST HEIGHT", rightX, y - 8)

        ctx.fillStyle = COLORS.accent
        ctx.font = "800 22px 'Bricolage Grotesque', sans-serif"
        ctx.fillText(highScore > 0 ? String(highScore) : "—", leftX, y + 14)
        ctx.fillText(
          bestHeight > 0 ? formatHeightLabel(bestHeight) : "—",
          rightX,
          y + 14,
        )
        y += 56
      }

      const coinCy = showBests ? y : y + 4
      drawMenuCoinIcon(ctx, cx - 28, coinCy, 9)
      ctx.fillStyle = COLORS.coinRim
      ctx.font = "800 22px 'Bricolage Grotesque', sans-serif"
      ctx.textAlign = "left"
      ctx.fillText(String(lifetimeCoins), cx - 12, coinCy + 1)
      ctx.textAlign = "center"
      y = coinCy + 34
    } else {
      y += 12
    }

    const pulse = 0.92 + Math.sin(anim * 3.2) * 0.08
    const btnW = 168
    const btnH = 52
    const play: ScreenRect = {
      x: cx - btnW / 2,
      y: y - btnH / 2,
      w: btnW,
      h: btnH,
    }

    ctx.save()
    ctx.translate(cx, y)
    ctx.scale(pulse, pulse)
    ctx.fillStyle = COLORS.accent
    ctx.beginPath()
    roundRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 14)
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    ctx.font = "800 22px 'Bricolage Grotesque', sans-serif"
    ctx.fillText("Play", 0, 1)
    ctx.restore()

    y += 48
    ctx.fillStyle = theme.inkDim
    ctx.font = "500 13px 'DM Sans', sans-serif"
    ctx.fillText("or tap anywhere to start", cx, y)

    // Bottom-corner variant pickers (below kill line)
    const bottomTop = camera.killScreenY
    const bottomH = height - bottomTop
    const pickerH = Math.min(72, bottomH - 8)
    const pickerY = bottomTop + (bottomH - pickerH) / 2
    const arrowW = 34
    const iconBox = 48
    const pickerW = arrowW + iconBox + arrowW
    const margin = 12

    const slingshotRow = drawCornerVariantPicker(
      ctx,
      margin,
      pickerY,
      pickerW,
      pickerH,
      arrowW,
      iconBox,
      "slingshot",
      slingshotStyle,
      slingshotLocked,
      this.time,
    )

    const backgroundRow = drawCornerVariantPicker(
      ctx,
      cx - pickerW / 2,
      pickerY,
      pickerW,
      pickerH,
      arrowW,
      iconBox,
      "background",
      backgroundStyle,
      backgroundLocked,
      this.time,
      backgroundLocked ? backgroundUnlockHint : null,
    )

    const ballRow = drawCornerVariantPicker(
      ctx,
      width - margin - pickerW,
      pickerY,
      pickerW,
      pickerH,
      arrowW,
      iconBox,
      "ball",
      ballStyle,
      ballLocked,
      this.time,
      ballLocked ? ballUnlockHint : null,
    )

    let buySlingshot: ScreenRect | null = null
    if (slingshotPrice != null && slingshotLocked) {
      const buyW = 112
      const buyH = 26
      const buyX = slingshotRow.icon.x + (slingshotRow.icon.w - buyW) / 2
      const buyY = slingshotRow.icon.y + slingshotRow.icon.h + 4
      buySlingshot = { x: buyX, y: buyY, w: buyW, h: buyH }
      const canAfford = lifetimeCoins >= slingshotPrice
      ctx.fillStyle = canAfford ? COLORS.coin : "rgba(17, 17, 17, 0.1)"
      ctx.beginPath()
      roundRect(ctx, buyX, buyY, buyW, buyH, 8)
      ctx.fill()
      ctx.fillStyle = canAfford ? COLORS.coinRim : COLORS.inkDim
      ctx.font = "800 12px 'Bricolage Grotesque', sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(`${slingshotPrice}`, buyX + buyW / 2 - 8, buyY + buyH / 2 + 1)
      drawMenuCoinIcon(ctx, buyX + buyW / 2 + 14, buyY + buyH / 2, 6)
    }

    let buyBackground: ScreenRect | null = null
    if (backgroundPrice != null && backgroundLocked) {
      const buyW = 112
      const buyH = 26
      const buyX = backgroundRow.icon.x + (backgroundRow.icon.w - buyW) / 2
      const buyY = backgroundRow.icon.y + backgroundRow.icon.h + 4
      buyBackground = { x: buyX, y: buyY, w: buyW, h: buyH }
      const canAfford = lifetimeCoins >= backgroundPrice
      ctx.fillStyle = canAfford ? COLORS.coin : "rgba(17, 17, 17, 0.1)"
      ctx.beginPath()
      roundRect(ctx, buyX, buyY, buyW, buyH, 8)
      ctx.fill()
      ctx.fillStyle = canAfford ? COLORS.coinRim : COLORS.inkDim
      ctx.font = "800 12px 'Bricolage Grotesque', sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(`${backgroundPrice}`, buyX + buyW / 2 - 8, buyY + buyH / 2 + 1)
      drawMenuCoinIcon(ctx, buyX + buyW / 2 + 14, buyY + buyH / 2, 6)
    }

    ctx.textBaseline = "alphabetic"
    return {
      play,
      slingshotPrev: slingshotRow.prev,
      slingshotNext: slingshotRow.next,
      slingshotPicker: { x: margin, y: pickerY, w: pickerW, h: pickerH },
      backgroundPrev: backgroundRow.prev,
      backgroundNext: backgroundRow.next,
      backgroundPicker: { x: cx - pickerW / 2, y: pickerY, w: pickerW, h: pickerH },
      ballPrev: ballRow.prev,
      ballNext: ballRow.next,
      ballPicker: { x: width - margin - pickerW, y: pickerY, w: pickerW, h: pickerH },
      buySlingshot,
      buyBackground,
    }
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
    replayHint: string | null = "Tap to continue",
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
    ctx.font = "800 36px 'Bricolage Grotesque', system-ui, sans-serif"
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
      ctx.font = "800 18px 'Bricolage Grotesque', system-ui, sans-serif"
      ctx.fillText(banner, cx, y)
      ctx.restore()
      y += 48
    }

    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 13px 'DM Sans', system-ui, sans-serif"
    ctx.fillText("SCORE", cx, y)
    y += 38

    ctx.fillStyle = COLORS.accent
    ctx.font = "800 52px 'Bricolage Grotesque', system-ui, sans-serif"
    ctx.fillText(String(score), cx, y)
    y += 36

    if (isNewHighScore) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "700 14px 'DM Sans', system-ui, sans-serif"
      ctx.fillText("New best!", cx, y)
    } else if (highScore > 0) {
      ctx.fillStyle = COLORS.inkDim
      ctx.font = "500 14px 'DM Sans', system-ui, sans-serif"
      ctx.fillText(`Best ${highScore}`, cx, y)
    }
    y += 40

    ctx.fillStyle = COLORS.inkDim
    ctx.font = "500 13px 'DM Sans', system-ui, sans-serif"
    ctx.fillText("HEIGHT", cx, y)
    y += 32

    ctx.fillStyle = COLORS.ink
    ctx.font = "800 36px 'Bricolage Grotesque', system-ui, sans-serif"
    ctx.fillText(formatHeightLabel(climbHeight), cx, y)
    y += 28

    if (isNewBestHeight) {
      ctx.fillStyle = COLORS.accent
      ctx.font = "700 14px 'DM Sans', system-ui, sans-serif"
      ctx.fillText("New best!", cx, y)
    } else if (bestHeight > 0) {
      ctx.fillStyle = COLORS.inkDim
      ctx.font = "500 14px 'DM Sans', system-ui, sans-serif"
      ctx.fillText(`Best ${formatHeightLabel(bestHeight)}`, cx, y)
    }
    y += 44

    if (replayHint) {
      ctx.fillStyle = COLORS.ink
      ctx.font = "600 16px 'DM Sans', system-ui, sans-serif"
      ctx.fillText(replayHint, cx, y)
    }

    ctx.textBaseline = "alphabetic"
  }

  drawBotBadge(_camera: Camera, style: string): void {
    const ctx = this.ctx
    const label = `BOT · ${style.toUpperCase()}`
    ctx.save()
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.font = "700 11px system-ui, sans-serif"
    const padX = 10
    const w = ctx.measureText(label).width + padX * 2
    const h = 22
    const x = 10
    const y = 10 + safeAreaInsetTop()
    ctx.fillStyle = "rgba(17,17,17,0.82)"
    ctx.beginPath()
    roundRect(ctx, x, y, w, h, 6)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.fillText(label, x + padX, y + h / 2)
    ctx.restore()
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

/**
 * Resolved `env(safe-area-inset-top)` from CSS (`--safe-top`).
 * Used so the HUD clears the iOS status bar under viewport-fit=cover.
 */
function safeAreaInsetTop(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--safe-top")
    .trim()
  const px = Number.parseFloat(raw)
  return Number.isFinite(px) ? px : 0
}

/** Compact altitude label for HUD and left-side marks (climb px above start). */
function formatHeightLabel(climb: number): string {
  if (climb >= 1000) {
    const k = climb / 1000
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`
  }
  return String(Math.round(climb))
}

function drawCornerVariantPicker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  arrowW: number,
  iconBox: number,
  kind: "slingshot" | "ball" | "background",
  style: SlingshotStyle | BallStyle | BackgroundStyle,
  locked: boolean,
  time: number,
  unlockHint: string | null = null,
): { prev: ScreenRect; next: ScreenRect; icon: ScreenRect } {
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)"
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, 12)
  ctx.fill()
  ctx.strokeStyle = "rgba(17, 17, 17, 0.08)"
  ctx.lineWidth = 1
  ctx.stroke()

  const prev: ScreenRect = { x, y, w: arrowW, h }
  const next: ScreenRect = { x: x + w - arrowW, y, w: arrowW, h }
  const icon: ScreenRect = { x: x + arrowW, y, w: iconBox, h }

  ctx.fillStyle = COLORS.accent
  ctx.font = "800 20px 'Bricolage Grotesque', sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("‹", x + arrowW / 2, y + h / 2 + 1)
  ctx.fillText("›", x + w - arrowW / 2, y + h / 2 + 1)

  const iconCx = icon.x + icon.w / 2
  const iconCy = icon.y + h / 2

  ctx.save()
  ctx.translate(iconCx, iconCy)
  if (kind === "slingshot") {
    drawSlingshotIconStyle(ctx, 0, 0, iconBox * 0.72, style as SlingshotStyle, time)
  } else if (kind === "background") {
    drawBackgroundPreview(ctx, iconBox, style as BackgroundStyle, time)
  } else {
    drawBallStyle(ctx, style as BallStyle, iconBox * 0.32, time)
  }
  ctx.restore()

  if (locked) {
    drawLockOverlay(ctx, icon.x + 2, icon.y + 2, icon.w - 4, h - 4, unlockHint)
  }

  return { prev, next, icon }
}

function drawLockOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hint: string | null = null,
): void {
  ctx.save()
  ctx.fillStyle = "rgba(255, 255, 255, 0.62)"
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, 8)
  ctx.fill()

  const cx = x + w / 2
  const lockY = hint ? y + h * 0.38 : y + h / 2
  const lockColor = "rgba(100, 116, 139, 0.92)"

  ctx.strokeStyle = lockColor
  ctx.fillStyle = lockColor
  ctx.lineWidth = 2
  ctx.lineCap = "round"

  ctx.beginPath()
  ctx.arc(cx, lockY - 3, 6, Math.PI, 0)
  ctx.stroke()

  ctx.beginPath()
  roundRect(ctx, cx - 8, lockY - 1, 16, 13, 3)
  ctx.fill()

  if (hint) {
    ctx.fillStyle = "rgba(51, 65, 85, 0.95)"
    ctx.font = "700 9px 'DM Sans', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "bottom"
    ctx.fillText(hint, cx, y + h - 4)
  }

  ctx.restore()
}

function hitRect(px: number, py: number, rect: ScreenRect): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  )
}

export { hitRect }

/** Small gold coin glyph for the main-menu lifetime total. */
function drawMenuCoinIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.save()
  const grd = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.4,
    1,
    x,
    y,
    radius,
  )
  grd.addColorStop(0, COLORS.coinCore)
  grd.addColorStop(0.55, COLORS.coin)
  grd.addColorStop(1, COLORS.coinRim)
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = COLORS.coinRim
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = COLORS.coinRim
  ctx.font = "800 10px 'Bricolage Grotesque', sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("$", x, y + 0.5)
  ctx.restore()
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
