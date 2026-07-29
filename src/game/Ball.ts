import {
  ARROW_PAD_SPEED,
  BALL_RADIUS,
  BUMPER_KNOCK,
  GRAVITY,
  PLATFORM_BOOST,
  PLATFORM_STUCK_HITS,
  PLATFORM_STUCK_NUDGE,
  PLATFORM_STUCK_VX,
  WALL_BOUNCE,
} from "./constants"
import type {
  ArrowPadData,
  BumperData,
  CardinalDir,
  PlatformData,
  PortalData,
  UpgradePickupData,
  Vec2,
} from "./types"

export interface BallUpdateResult {
  /** Player ball landed on a purple bonus platform. */
  bonusCollected: boolean
  /** World position to spawn the "+100" popup (platform top-center). */
  bonusAt: Vec2 | null
  /** Player ball collected a pickup (kind set when true). */
  upgradeCollected: "dual" | "bullets" | "freeMove" | "pow" | null
  /** Any platform landing this frame (used by purple bonus balls). */
  platformHit: boolean
  /** World-Y change from a portal teleport this frame (0 if none). */
  portalDeltaY: number
}

/** Unit vectors for 8 cardinal dirs in world space (Y up). */
const DIR_VECTORS: Record<CardinalDir, Vec2> = {
  0: { x: 0, y: 1 },
  1: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  2: { x: 1, y: 0 },
  3: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  4: { x: 0, y: -1 },
  5: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  6: { x: -1, y: 0 },
  7: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
}

export class Ball {
  x = 0
  y = 0
  vx = 0
  vy = 0
  radius = BALL_RADIUS
  inSlingshot = true
  /** Purple secondary ball from a 2x pickup — scores on platforms, ignores kill line. */
  isBonus = false
  /** Brief squash after launch / bounce for juice. */
  squash = 0
  /** Near-vertical bounces on the same platform (anti-stuck). */
  private stuckHits = 0
  private stuckPlatformKey = ""

  reset(x: number, y: number): void {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.inSlingshot = true
    this.isBonus = false
    this.squash = 0
    this.clearStuckTracking()
  }

  /** Spawn as a flying purple bonus ball. */
  spawnBonus(x: number, y: number, vx: number, vy: number): void {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.inSlingshot = false
    this.isBonus = true
    this.squash = 1
    this.clearStuckTracking()
  }

  launch(velocity: Vec2): void {
    this.vx = velocity.x
    this.vy = velocity.y
    this.inSlingshot = false
    this.squash = 1
    this.clearStuckTracking()
  }

  catchAt(x: number, y: number): void {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.inSlingshot = true
    this.squash = 1
    this.clearStuckTracking()
  }

  private clearStuckTracking(): void {
    this.stuckHits = 0
    this.stuckPlatformKey = ""
  }

  private findPortalAt(
    portals: PortalData[],
    side: "left" | "right",
  ): PortalData | null {
    for (const p of portals) {
      if (p.side !== side) continue
      if (this.y >= p.y && this.y <= p.y + p.height) return p
    }
    return null
  }

  /** Nearest portal on the opposite wall that sits strictly above the entry. */
  private findNextPortalUp(
    portals: PortalData[],
    entry: PortalData,
  ): PortalData | null {
    const opposite = entry.side === "left" ? "right" : "left"
    let best: PortalData | null = null
    for (const p of portals) {
      if (p.side !== opposite) continue
      if (p.y <= entry.y) continue
      if (!best || p.y < best.y) best = p
    }
    return best
  }

  private teleportThroughPortal(
    entry: PortalData,
    exit: PortalData,
    worldWidth: number,
  ): number {
    const prevY = this.y
    const frac = Math.max(0, Math.min(1, (this.y - entry.y) / entry.height))
    this.y = exit.y + frac * exit.height
    if (exit.side === "left") {
      this.x = this.radius + 0.5
    } else {
      this.x = worldWidth - this.radius - 0.5
    }
    // Keep vx/vy so momentum continues through the portal
    this.squash = 0.35
    return this.y - prevY
  }

  private collideBumpers(bumpers: BumperData[]): void {
    for (const b of bumpers) {
      const dx = this.x - b.x
      const dy = this.y - b.y
      const dist = Math.hypot(dx, dy)
      const minDist = this.radius + b.radius
      if (dist >= minDist || dist < 0.0001) continue

      const nx = dx / dist
      const ny = dy / dist
      this.x = b.x + nx * minDist
      this.y = b.y + ny * minDist

      const into = this.vx * nx + this.vy * ny
      if (into < 0) {
        this.vx -= 2 * into * nx
        this.vy -= 2 * into * ny
      }
      this.vx += nx * BUMPER_KNOCK
      this.vy += ny * BUMPER_KNOCK
      this.squash = 0.9
    }
  }

  private collideArrowPads(pads: ArrowPadData[]): void {
    for (let i = pads.length - 1; i >= 0; i--) {
      const pad = pads[i]!
      const dist = Math.hypot(this.x - pad.x, this.y - pad.y)
      if (dist >= this.radius + pad.radius) continue
      const dir = DIR_VECTORS[pad.dir]
      this.vx = dir.x * ARROW_PAD_SPEED * 0.5
      this.vy = dir.y * ARROW_PAD_SPEED
      this.squash = 0.75
      pads.splice(i, 1)
    }
  }

  /**
   * World Y increases upward. Constant gravity only — no air drag —
   * so arcs stay parabolic and horizontal momentum is preserved.
   */
  update(
    dt: number,
    worldWidth: number,
    platforms: PlatformData[],
    portals: PortalData[],
    bumpers: BumperData[],
    arrowPads: ArrowPadData[],
    upgrades: UpgradePickupData[],
  ): BallUpdateResult {
    const result: BallUpdateResult = {
      bonusCollected: false,
      bonusAt: null,
      upgradeCollected: null,
      platformHit: false,
      portalDeltaY: 0,
    }
    if (this.inSlingshot) {
      this.squash = Math.max(0, this.squash - dt * 3)
      return result
    }

    this.vy -= GRAVITY * dt
    this.x += this.vx * dt
    this.y += this.vy * dt

    // Walls or staggered portals (always exit the next portal up on the other side)
    if (this.x - this.radius < 0) {
      const entry = this.vx <= 0 ? this.findPortalAt(portals, "left") : null
      const exit = entry ? this.findNextPortalUp(portals, entry) : null
      if (entry && exit) {
        result.portalDeltaY = this.teleportThroughPortal(entry, exit, worldWidth)
      } else {
        this.x = this.radius
        this.vx = Math.abs(this.vx) * WALL_BOUNCE
        this.squash = 0.6
      }
    } else if (this.x + this.radius > worldWidth) {
      const entry = this.vx >= 0 ? this.findPortalAt(portals, "right") : null
      const exit = entry ? this.findNextPortalUp(portals, entry) : null
      if (entry && exit) {
        result.portalDeltaY = this.teleportThroughPortal(entry, exit, worldWidth)
      } else {
        this.x = worldWidth - this.radius
        this.vx = -Math.abs(this.vx) * WALL_BOUNCE
        this.squash = 0.6
      }
    }

    this.collideBumpers(bumpers)
    this.collideArrowPads(arrowPads)

    // Only the player ball collects pickups
    if (!this.isBonus) {
      for (let i = upgrades.length - 1; i >= 0; i--) {
        const u = upgrades[i]!
        const dist = Math.hypot(this.x - u.x, this.y - u.y)
        if (dist < this.radius + u.radius) {
          result.upgradeCollected = u.kind
          upgrades.splice(i, 1)
        }
      }
    }

    // One-way platforms: boost upward on contact from above; keep horizontal velocity
    if (this.vy < 0) {
      for (const p of platforms) {
        const left = p.x
        const right = p.x + p.width
        const top = p.y + p.height
        const prevY = this.y - this.vy * dt
        const bottomOfBall = this.y - this.radius
        const prevBottom = prevY - this.radius

        if (
          this.x + this.radius * 0.6 > left &&
          this.x - this.radius * 0.6 < right &&
          prevBottom >= top - 2 &&
          bottomOfBall <= top &&
          bottomOfBall >= top - Math.abs(this.vy * dt) - 8
        ) {
          this.y = top + this.radius
          this.vy = PLATFORM_BOOST
          this.squash = 0.85
          result.platformHit = true

          // Break perfect vertical bounce loops on the same platform
          const key = `${p.x.toFixed(1)}:${p.y.toFixed(1)}:${p.width.toFixed(1)}`
          if (Math.abs(this.vx) < PLATFORM_STUCK_VX) {
            if (key === this.stuckPlatformKey) this.stuckHits += 1
            else {
              this.stuckPlatformKey = key
              this.stuckHits = 1
            }
            if (this.stuckHits >= PLATFORM_STUCK_HITS) {
              const side = Math.random() < 0.5 ? -1 : 1
              this.vx = side * PLATFORM_STUCK_NUDGE
              this.stuckHits = 0
            }
          } else {
            this.clearStuckTracking()
          }

          if (!this.isBonus && p.bonus) {
            p.bonus = false
            result.bonusCollected = true
            result.bonusAt = { x: p.x + p.width * 0.5, y: p.y + p.height }
          }
          break
        }
      }
    }

    this.squash = Math.max(0, this.squash - dt * 4)
    return result
  }
}
