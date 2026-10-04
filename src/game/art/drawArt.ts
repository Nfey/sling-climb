import {
  COLORS,
  MILESTONE_COLORS,
  SLINGSHOT_FORK_HEIGHT,
  TURRET_BODY_RADIUS,
} from "../constants"
import type { Camera } from "../Camera"
import type { SlingshotStyle } from "../cosmetics"
import type { Slingshot } from "../Slingshot"
import type {
  ArrowPadData,
  BumperData,
  CoinData,
  PlatformData,
  PortalData,
  TurretShotData,
  UpgradePickupData,
  WallTurretData,
} from "../types"
import { slingBand } from "./cosmeticsData"
import { drawMountPlate } from "./canyon"
import { NIGHT_RIM_CLIMB } from "./palette"
import { playRight, wallLeft, wallRight } from "./layout"
import {
  drawSprite,
  drawSpriteDerived,
  drawSpriteTile,
  hasSprite,
  spriteFrame,
  spritesReady,
  tintedSprite,
} from "./sprites"

export interface SquashContact {
  x: number
  y: number
  radius: number
  squash: number
}

export interface CrumbleAnim {
  x: number
  y: number
  width: number
  height: number
  born: number
  night: boolean
}

const crumblePrev = new Map<string, PlatformData>()
const crumbleAnims: CrumbleAnim[] = []

export function artReady(): boolean {
  return spritesReady()
}

export function nightAt(worldY: number, startHeight: number): boolean {
  return worldY - startHeight >= NIGHT_RIM_CLIMB
}

function platformKey(p: PlatformData): string {
  return `${p.x.toFixed(2)}:${p.y.toFixed(2)}:${p.width.toFixed(1)}`
}

/** Remember crumbling platforms so the break strip can play after they pop. */
export function syncCrumbling(
  platforms: readonly PlatformData[],
  time: number,
  camera: Camera,
): void {
  const now = new Map<string, PlatformData>()
  for (const p of platforms) {
    if (p.kind !== "crumbling" || p.active === false) continue
    now.set(platformKey(p), p)
  }
  for (const [key, prev] of crumblePrev) {
    if (now.has(key)) continue
    const top = camera.worldToScreen({ x: prev.x, y: prev.y + prev.height })
    if (top.y < -80 || top.y > camera.height + 80) continue
    if (top.y >= camera.killScreenY - 2) continue
    crumbleAnims.push({
      x: prev.x,
      y: prev.y,
      width: prev.width,
      height: prev.height,
      born: time,
      night: false,
    })
  }
  crumblePrev.clear()
  for (const [key, p] of now) crumblePrev.set(key, p)
  for (let i = crumbleAnims.length - 1; i >= 0; i--) {
    if (time - crumbleAnims[i]!.born > 4 / 12) crumbleAnims.splice(i, 1)
  }
}

function platformSquashing(
  p: PlatformData,
  contacts: readonly SquashContact[],
): boolean {
  const top = p.y + p.height
  for (const ball of contacts) {
    if (ball.squash < 0.5) continue
    if (ball.x < p.x - 2 || ball.x > p.x + p.width + 2) continue
    const bottom = ball.y - ball.radius
    if (Math.abs(bottom - top) <= 8) return true
  }
  return false
}

function drawSlice(
  ctx: CanvasRenderingContext2D,
  kind: string,
  part: "left" | "mid" | "right",
  squash: boolean,
  anchorX: number,
  anchorY: number,
  night: boolean,
  tileEnd?: number,
): void {
  const id = `platforms/${kind}_${part}${squash ? "_squash" : ""}`
  if (part === "mid" && tileEnd != null) {
    drawSpriteTile(ctx, id, anchorX, tileEnd, anchorY, { night })
    return
  }
  drawSprite(ctx, id, anchorX, anchorY, { night })
}

export function drawPlatformsArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  platforms: readonly PlatformData[],
  contacts: readonly SquashContact[],
  time: number,
  startHeight: number,
): boolean {
  if (!artReady()) return false
  syncCrumbling(platforms, time, camera)
  const killY = camera.killScreenY

  for (const anim of crumbleAnims) {
    anim.night = nightAt(anim.y, startHeight)
    const tl = camera.worldToScreen({ x: anim.x, y: anim.y + anim.height })
    const frame = spriteFrame(
      anim.night
        ? "platforms/crumbling-night_break_4f_12fps"
        : "platforms/crumbling_break_4f_12fps",
      time - anim.born,
    )
    const id = anim.night
      ? "platforms/crumbling-night_break_4f_12fps"
      : "platforms/crumbling_break_4f_12fps"
    ctx.save()
    ctx.translate(tl.x, tl.y)
    ctx.scale(anim.width / 140, 1)
    drawSprite(ctx, id, 0, 0, { frame, night: anim.night })
    ctx.restore()
  }

  for (const p of platforms) {
    if (p.active === false) continue
    const tl = camera.worldToScreen({ x: p.x, y: p.y + p.height })
    const br = camera.worldToScreen({ x: p.x + p.width, y: p.y })
    if (tl.y >= killY || br.y < -40 || tl.y > camera.height + 40) continue

    const night = nightAt(p.y, startHeight)
    const squash = platformSquashing(p, contacts)
    const kind = p.kind === "crumbling" && night ? "crumbling-night" : p.kind
    const topX = tl.x
    const topY = tl.y
    const w = p.width

    if (p.kind === "bonus") {
      for (let i = 0; i < 4; i++) {
        const gem =
          i === 1 || i === 2
            ? "platforms/bonus_gem-large"
            : "platforms/bonus_gem-small"
        drawSprite(ctx, gem, topX + (w * (i + 0.5)) / 4, topY - 1, { night })
      }
    }

    drawSlice(ctx, kind, "left", squash, topX, topY, night)
    drawSlice(ctx, kind, "mid", squash, topX + 8, topY, night, topX + w - 8)
    drawSlice(ctx, kind, "right", squash, topX + w, topY, night)

    if (p.kind === "crumbling") {
      const crack = "platforms/crumbling_crack"
      drawSprite(ctx, crack, topX + w * 0.36, topY, { night })
      drawSprite(ctx, crack, topX + w * 0.7, topY, { night })
    } else if (p.kind === "moving") {
      drawSprite(ctx, "platforms/moving_chevron", topX + w + 9, topY, { night })
      drawSprite(ctx, "platforms/moving_chevron", topX - 9, topY, {
        night,
        flipX: true,
      })
    }
  }
  return true
}

export function drawBumpersArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  bumpers: readonly BumperData[],
  startHeight: number,
): boolean {
  if (!artReady()) return false
  const killY = camera.killScreenY
  for (const b of bumpers) {
    const s = camera.worldToScreen({ x: b.x, y: b.y })
    if (s.y - b.radius >= killY || s.y + b.radius < -20) continue
    const small = b.radius < 23
    const id = small ? "objects/bumper-r18_idle" : "objects/bumper_idle"
    const scale = small ? b.radius / 18 : b.radius / 28
    drawSprite(ctx, id, s.x, s.y, {
      scale,
      night: nightAt(b.y, startHeight),
    })
  }
  return true
}

export function drawArrowPadsArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  pads: readonly ArrowPadData[],
  startHeight: number,
): boolean {
  if (!artReady()) return false
  const killY = camera.killScreenY
  for (const pad of pads) {
    const s = camera.worldToScreen({ x: pad.x, y: pad.y })
    if (s.y - pad.radius >= killY || s.y + pad.radius < -20) continue
    const night = nightAt(pad.y, startHeight)
    const scale = pad.radius / 26
    drawSprite(ctx, "objects/arrow-pad_idle", s.x, s.y, { scale, night })
    const angle = (pad.dir * Math.PI) / 4
    drawSprite(ctx, "objects/arrow-pad_arrow", s.x, s.y, { scale, rotate: angle })
  }
  return true
}

export function drawUpgradeArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  pickups: readonly UpgradePickupData[],
  time: number,
  startHeight: number,
): boolean {
  if (!artReady()) return false
  let drewPow = false
  const killY = camera.killScreenY
  const bob = Math.sin(time * 4) * 3
  for (const u of pickups) {
    if (u.kind !== "pow") continue
    const s = camera.worldToScreen({ x: u.x, y: u.y })
    s.y += bob
    if (s.y - u.radius >= killY || s.y + u.radius < -20) continue
    const frame = spriteFrame("objects/pow_pulse_4f_8fps", time)
    drawSprite(ctx, "objects/pow_pulse_4f_8fps", s.x, s.y, {
      frame,
      scale: u.radius / 22,
      night: nightAt(u.y, startHeight),
    })
    drewPow = true
  }
  return drewPow
}

export function drawCoinsArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  coins: readonly CoinData[],
  time: number,
  startHeight: number,
): boolean {
  if (!artReady()) return false
  const killY = camera.killScreenY
  const bob = Math.sin(time * 5) * 2.5
  const frame = spriteFrame("objects/coin_spin_8f_12fps", time)
  for (const c of coins) {
    const s = camera.worldToScreen({ x: c.x, y: c.y })
    s.y += bob
    if (s.y - c.radius >= killY || s.y + c.radius < -20) continue
    drawSprite(ctx, "objects/coin_spin_8f_12fps", s.x, s.y, {
      frame,
      scale: c.radius / 15,
      night: nightAt(c.y, startHeight),
    })
  }
  return true
}

export function drawPortalsArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  portals: readonly PortalData[],
  time: number,
  startHeight: number,
  plateInk: string | null = null,
): boolean {
  if (!artReady()) return false
  const frame = spriteFrame("objects/portal-swirl_6f_10fps", time)
  for (const p of portals) {
    const top = camera.worldToScreen({ x: 0, y: p.y + p.height })
    const bottom = camera.worldToScreen({ x: 0, y: p.y })
    const h = bottom.y - top.y
    if (bottom.y < -20 || top.y > camera.height + 20) continue
    const right = p.side === "right"
    const wallX = right ? wallRight(camera.width) : wallLeft()
    const centerY = top.y + h / 2
    if (plateInk) {
      drawMountPlate(
        ctx,
        p.side,
        centerY,
        p.height,
        p.y + p.height / 2 - startHeight,
        camera.width,
        plateInk,
      )
    }
    const night = nightAt(p.y, startHeight)
    drawSprite(ctx, "objects/portal-pillar", wallX, centerY, {
      flipX: right,
      night,
    })
    // Swirl anchor is the frame top-left, shared with the pillar canvas.
    const pillarAnchorY = 156 / 3
    drawSprite(ctx, "objects/portal-swirl_6f_10fps", wallX, centerY - pillarAnchorY, {
      frame,
      flipX: right,
    })
  }
  return true
}

export function drawTurretsArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  turrets: readonly WallTurretData[],
  time: number,
  startHeight: number,
  muzzleAngle: (side: WallTurretData["side"], aim: number) => number,
  plateInk: string | null = null,
): boolean {
  if (!artReady()) return false
  for (const t of turrets) {
    const domeX =
      t.side === "left"
        ? wallLeft(TURRET_BODY_RADIUS)
        : wallRight(camera.width, TURRET_BODY_RADIUS)
    const s = camera.worldToScreen({ x: domeX, y: t.y })
    if (s.y < -40 || s.y > camera.height + 40) continue
    if (plateInk) {
      drawMountPlate(
        ctx,
        t.side,
        s.y,
        TURRET_BODY_RADIUS * 2,
        t.y - startHeight,
        camera.width,
        plateInk,
      )
    }
    const night = nightAt(t.y, startHeight)
    const firing = t.fireCooldown < 0.25
    drawSprite(ctx, "objects/turret-body_idle", domeX, s.y, {
      flipX: t.side === "right",
      night,
    })
    const angle = muzzleAngle(t.side, t.aimAngle)
    const pivotX = domeX + Math.cos(angle) * TURRET_BODY_RADIUS
    const pivotY = s.y + Math.sin(angle) * TURRET_BODY_RADIUS
    drawSprite(
      ctx,
      firing ? "objects/turret-barrel_recoil" : "objects/turret-barrel_idle",
      pivotX,
      pivotY,
      { rotate: angle, night },
    )
    if (firing) {
      const tip = TURRET_BODY_RADIUS + 30
      const flash = 0.7 + Math.sin(time * 18) * 0.3
      drawSprite(
        ctx,
        "objects/turret-muzzle-flash",
        domeX + Math.cos(angle) * tip,
        s.y + Math.sin(angle) * tip,
        { rotate: angle, night, alpha: flash },
      )
    }
  }
  return true
}

export function drawTurretShotsArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  shots: readonly TurretShotData[],
  time: number,
  startHeight: number,
): boolean {
  if (!artReady()) return false
  const frame = spriteFrame("objects/turret-shot_2f_8fps", time)
  for (const shot of shots) {
    const s = camera.worldToScreen({ x: shot.x, y: shot.y })
    if (s.y < -20 || s.y > camera.height + 20) continue
    drawSprite(ctx, "objects/turret-shot_2f_8fps", s.x, s.y, {
      frame,
      scale: shot.radius / 7,
      night: nightAt(shot.y, startHeight),
    })
  }
  return true
}

/** Screen point where the slingshot art's base pivot sits (procedural fork base). */
export function slingshotArtAnchor(
  camera: Camera,
  sling: Slingshot,
): { x: number; y: number } {
  const base = camera.worldToScreen(sling.base)
  return { x: base.x, y: base.y + SLINGSHOT_FORK_HEIGHT * 0.2 }
}

export function drawSlingshotArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  sling: Slingshot,
  pouchX: number,
  pouchY: number,
  style: SlingshotStyle,
  pow: boolean,
  startHeight: number,
): boolean {
  if (!artReady()) return false
  const anchor = slingshotArtAnchor(camera, sling)
  const night = nightAt(sling.y, startHeight)
  const body = pow
    ? "slings/classic_pow"
    : hasSprite(`slings/${style}`)
      ? `slings/${style}`
      : null
  if (!body || !hasSprite(body)) return false
  if (night) {
    drawSpriteDerived(ctx, body, anchor.x, anchor.y, {
      color: "#FFF1D6",
      alpha: 0.7,
      padCss: 2,
    })
  }
  if (!drawSprite(ctx, body, anchor.x, anchor.y)) return false
  const pouchId = slingBand(pow ? "classic" : style).pouch
  if (hasSprite(pouchId)) {
    if (night) {
      drawSpriteDerived(ctx, pouchId, pouchX, pouchY, {
        color: "#FFF1D6",
        alpha: 0.7,
        padCss: 2,
      })
    }
    drawSprite(ctx, pouchId, pouchX, pouchY)
  }
  return true
}

export function drawCatchFlashArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  sling: Slingshot,
  alpha: number,
  bodyId = "slings/classic",
): boolean {
  if (!artReady() || alpha <= 0 || !hasSprite(bodyId)) return false
  const anchor = slingshotArtAnchor(camera, sling)
  return drawSpriteDerived(ctx, bodyId, anchor.x, anchor.y, {
    color: "#ffffff",
    alpha: Math.min(1, alpha),
    padCss: 0,
    composite: "lighter",
  })
}

export function drawKillLineArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  startHeight: number,
): boolean {
  if (!artReady()) return false
  const right = playRight(camera.width)
  const night = nightAt(camera.screenToWorld(0, camera.killScreenY).y, startHeight)
  return drawSpriteTile(
    ctx,
    "markers/kill-line_tile",
    wallLeft(16),
    right - 16,
    camera.killScreenY,
    { night },
  )
}

export function drawBestArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  sy: number,
  passed: boolean,
  worldY: number,
  startHeight: number,
  flash: number,
  glow: number,
): boolean {
  if (!artReady()) return false
  const right = playRight(camera.width)
  const night = nightAt(worldY, startHeight)
  const rope = passed ? "markers/best-rope-passed_tile" : "markers/best-rope_tile"
  const flag = passed ? "markers/best-flag-passed" : "markers/best-flag"
  drawSpriteTile(ctx, rope, wallLeft(12), right - 12, sy, { night })
  if (glow > 0) {
    const u = 1 - glow / 0.6
    const alpha = Math.sin(Math.max(0, Math.min(1, u)) * Math.PI)
    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.globalCompositeOperation = "lighter"
    drawSpriteTile(ctx, "markers/best-rope-glow_tile", wallLeft(12), right - 12, sy)
    ctx.restore()
  }
  const flagX = right - 40
  drawSprite(ctx, flag, flagX, sy, { night })
  if (flash > 0) {
    drawSprite(ctx, "markers/best-flag_flash", flagX, sy, {
      composite: "lighter",
      alpha: Math.max(0, Math.min(1, flash / 0.25)),
    })
  }
  const color = passed ? COLORS.maxHeightLinePassed : COLORS.maxHeightLine
  drawHeightLabel(ctx, passed ? "BEST ✓" : "BEST", flagX, sy, color)
  return true
}

export function drawMilestonesArt(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  milestones: readonly {
    worldY: number
    label: string
    passed: boolean
    colorIndex: number
  }[],
  startHeight: number,
): boolean {
  if (!artReady()) return false
  const right = playRight(camera.width)
  const flagX = right - 40
  for (const m of milestones) {
    const sy = camera.worldToScreen({ x: 0, y: m.worldY }).y
    if (sy < -40 || sy > camera.killScreenY + 24) continue
    const unpassed = MILESTONE_COLORS[m.colorIndex % MILESTONE_COLORS.length]!
    const color = m.passed ? COLORS.milestoneLinePassed : unpassed
    const night = nightAt(m.worldY, startHeight)
    const core = tintedSprite("markers/milestone-rope_tile_core-white", color)
    const flagCore = tintedSprite("markers/milestone-flag_core-white", color)
    drawSpriteTile(ctx, "markers/milestone-rope_tile_ink", wallLeft(12), right - 12, sy, {
      night,
    })
    if (core) {
      drawSpriteTile(ctx, "markers/milestone-rope_tile_core-white", wallLeft(12), right - 12, sy, {
        source: core,
      })
    }
    if (flagCore) {
      drawSprite(ctx, "markers/milestone-flag_core-white", flagX, sy, { source: flagCore })
    }
    drawSprite(ctx, "markers/milestone-flag_ink", flagX, sy, { night })
    drawHeightLabel(ctx, m.passed ? `${m.label} ✓` : m.label, flagX, sy, color)
  }
  return true
}

function drawHeightLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  flagX: number,
  sy: number,
  color: string,
): void {
  ctx.save()
  ctx.fillStyle = color
  ctx.font = "700 11px 'DM Sans', sans-serif"
  ctx.textAlign = "right"
  ctx.textBaseline = "bottom"
  ctx.fillText(text, flagX - 26, sy - 4)
  ctx.restore()
}

