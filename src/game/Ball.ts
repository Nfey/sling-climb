import {
  ARROW_PAD_SPEED,
  BALL_RADIUS,
  BUMPER_KNOCK,
  GRAVITY,
  PLATFORM_BOOST,
  PLATFORM_STUCK_HITS,
  PLATFORM_STUCK_NUDGE,
  PLATFORM_STUCK_VX,
  PORTAL_SPEED_DAMPING,
  WALL_BOUNCE,
} from "./constants"
import type {
  ArrowPadData,
  BumperData,
  CardinalDir,
  CoinData,
  PlatformData,
  PortalData,
  UpgradePickupData,
  Vec2,
} from "./types"

export interface BallUpdateResult {
  /** Player ball landed on a purple bonus platform. */
  bonusCollected: boolean
  /** World position to spawn the purple-platform score popup. */
  bonusAt: Vec2 | null
  /** Player ball collected a pickup (kind set when true). */
  upgradeCollected: "dual" | "bullets" | "freeMove" | "pow" | null
  /** Coins collected this frame (player ball only). */
  coinsCollected: number
  /** World position of the last coin collected this frame. */
  coinAt: Vec2 | null
  /** Any platform landing this frame (used by purple bonus balls / combo). */
  platformHit: boolean
  /** World-Y change from a portal teleport this frame (0 if none). */
  portalDeltaY: number
  /** Side-wall bounce this frame (not a portal entry). */
  wallHit: boolean
  /** Fresh bumper contact this frame (not continuous overlap). */
  bumperHit: boolean
  bumperAt: Vec2 | null
  /** Arrow pad consumed this frame. */
  arrowHit: boolean
  arrowAt: Vec2 | null
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
  /** Bumper keys currently overlapping — used to SFX/score only on enter. */
  private bumperOverlaps = new Set<string>()

  reset(x: number, y: number): void {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.inSlingshot = true
    this.isBonus = false
    this.squash = 0
    this.clearStuckTracking()
    this.bumperOverlaps.clear()
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
    this.bumperOverlaps.clear()
  }

  launch(velocity: Vec2): void {
    this.vx = velocity.x
    this.vy = velocity.y
    this.inSlingshot = false
    this.squash = 1
    this.clearStuckTracking()
    this.bumperOverlaps.clear()
  }

  catchAt(x: number, y: number): void {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.inSlingshot = true
    this.squash = 1
    this.clearStuckTracking()
    this.bumperOverlaps.clear()
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
    if (this.vy < 0) {
      this.vy *= PORTAL_SPEED_DAMPING
    }
    this.squash = 0.35
    return this.y - prevY
  }

  private collideBumpers(bumpers: BumperData[]): { hit: boolean; at: Vec2 | null } {
    let hit = false
    let at: Vec2 | null = null
    const current = new Set<string>()
    for (const b of bumpers) {
      const dx = this.x - b.x
      const dy = this.y - b.y
      const dist = Math.hypot(dx, dy)
      const minDist = this.radius + b.radius
      if (dist >= minDist || dist < 0.0001) continue

      const key = `${b.x.toFixed(1)}:${b.y.toFixed(1)}`
      current.add(key)
      const entered = !this.bumperOverlaps.has(key)

      const nx = dx / dist
      const ny = dy / dist
      this.x = b.x + nx * minDist
      this.y = b.y + ny * minDist

      const into = this.vx * nx + this.vy * ny
      if (into < 0) {
        this.vx -= 2 * into * nx
        this.vy -= 2 * into * ny
      }
      // Dampen outgoing speed so bumpers don't accelerate the ball excessively
      const speed = Math.hypot(this.vx, this.vy)
      const maxBumperSpeed = 800
      if (speed > maxBumperSpeed) {
        const scale = maxBumperSpeed / speed
        this.vx *= scale
        this.vy *= scale
      }
      this.vx += nx * BUMPER_KNOCK
      // Reduce downward knock so gravity doesn't compound into extreme speed
      const knockY = ny < 0 ? ny * BUMPER_KNOCK * 0.35 : ny * BUMPER_KNOCK
      this.vy += knockY
      this.squash = 0.9

      if (entered && !hit) {
        hit = true
        at = { x: b.x, y: b.y + b.radius }
      }
    }
    this.bumperOverlaps = current
    return { hit, at }
  }

  private collideArrowPads(
    pads: ArrowPadData[],
  ): { hit: boolean; at: Vec2 | null } {
    for (let i = pads.length - 1; i >= 0; i--) {
      const pad = pads[i]!
      const dist = Math.hypot(this.x - pad.x, this.y - pad.y)
      if (dist >= this.radius + pad.radius) continue
      const dir = DIR_VECTORS[pad.dir]
      this.vx = dir.x * ARROW_PAD_SPEED * 0.5
      // Halve downward arrow speed so gravity doesn't compound into extreme velocity
      this.vy = dir.y < 0 ? dir.y * ARROW_PAD_SPEED * 0.45 : dir.y * ARROW_PAD_SPEED
      this.squash = 0.75
      const at = { x: pad.x, y: pad.y + pad.radius }
      pads.splice(i, 1)
      return { hit: true, at }
    }
    return { hit: false, at: null }
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
    coins: CoinData[],
  ): BallUpdateResult {
    const result: BallUpdateResult = {
      bonusCollected: false,
      bonusAt: null,
      upgradeCollected: null,
      coinsCollected: 0,
      coinAt: null,
      platformHit: false,
      portalDeltaY: 0,
      wallHit: false,
      bumperHit: false,
      bumperAt: null,
      arrowHit: false,
      arrowAt: null,
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
        result.wallHit = true
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
        result.wallHit = true
      }
    }

    const bumper = this.collideBumpers(bumpers)
    result.bumperHit = bumper.hit
    result.bumperAt = bumper.at
    const arrow = this.collideArrowPads(arrowPads)
    result.arrowHit = arrow.hit
    result.arrowAt = arrow.at

    // Only the player ball collects pickups and coins
    if (!this.isBonus) {
      for (let i = upgrades.length - 1; i >= 0; i--) {
        const u = upgrades[i]!
        const dist = Math.hypot(this.x - u.x, this.y - u.y)
        if (dist < this.radius + u.radius) {
          result.upgradeCollected = u.kind
          upgrades.splice(i, 1)
        }
      }
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]!
        const dist = Math.hypot(this.x - c.x, this.y - c.y)
        if (dist < this.radius + c.radius) {
          result.coinsCollected += 1
          result.coinAt = { x: c.x, y: c.y }
          coins.splice(i, 1)
        }
      }
    }

    // One-way platforms: boost upward on contact from above; keep horizontal velocity
    if (this.vy < 0) {
      for (const p of platforms) {
        if (p.active === false) continue
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
          const anchorX = p.originX ?? p.x
          const key = `${anchorX.toFixed(1)}:${p.y.toFixed(1)}:${p.width.toFixed(1)}`
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

          if (p.kind === "crumbling") {
            p.active = false
          } else if (!this.isBonus && p.kind === "bonus") {
            p.kind = "normal"
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
