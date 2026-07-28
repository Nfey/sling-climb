import {
  ARROW_PAD_SPEED,
  BALL_RADIUS,
  BUMPER_KNOCK,
  GRAVITY,
  PLATFORM_BOOST,
  WALL_BOUNCE,
} from "./constants"
import type {
  ArrowPadData,
  BumperData,
  CardinalDir,
  PlatformData,
  PortalPair,
  Vec2,
} from "./types"

export interface BallUpdateResult {
  bonusCollected: boolean
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
  /** Brief squash after launch / bounce for juice. */
  squash = 0
  /** Arrow pads currently overlapped — launch only on enter. */
  private arrowOverlaps = new Set<number>()

  reset(x: number, y: number): void {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.inSlingshot = true
    this.squash = 0
    this.arrowOverlaps.clear()
  }

  launch(velocity: Vec2): void {
    this.vx = velocity.x
    this.vy = velocity.y
    this.inSlingshot = false
    this.squash = 1
    this.arrowOverlaps.clear()
  }

  catchAt(x: number, y: number): void {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.inSlingshot = true
    this.squash = 0.4
    this.arrowOverlaps.clear()
  }

  private findLeftPortal(portals: PortalPair[]): PortalPair | null {
    for (const p of portals) {
      if (this.y >= p.leftY && this.y <= p.leftY + p.height) return p
    }
    return null
  }

  private findRightPortal(portals: PortalPair[]): PortalPair | null {
    for (const p of portals) {
      if (this.y >= p.rightY && this.y <= p.rightY + p.height) return p
    }
    return null
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
    const now = new Set<number>()
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i]!
      const dist = Math.hypot(this.x - pad.x, this.y - pad.y)
      if (dist >= this.radius + pad.radius) continue
      now.add(i)
      if (!this.arrowOverlaps.has(i)) {
        const dir = DIR_VECTORS[pad.dir]
        this.vx = dir.x * ARROW_PAD_SPEED
        this.vy = dir.y * ARROW_PAD_SPEED
        this.squash = 0.75
      }
    }
    this.arrowOverlaps = now
  }

  /**
   * World Y increases upward. Constant gravity only — no air drag —
   * so arcs stay parabolic and horizontal momentum is preserved.
   */
  update(
    dt: number,
    worldWidth: number,
    platforms: PlatformData[],
    portals: PortalPair[],
    bumpers: BumperData[],
    arrowPads: ArrowPadData[],
  ): BallUpdateResult {
    const result: BallUpdateResult = { bonusCollected: false }
    if (this.inSlingshot) {
      this.squash = Math.max(0, this.squash - dt * 3)
      return result
    }

    this.vy -= GRAVITY * dt
    this.x += this.vx * dt
    this.y += this.vy * dt

    // Walls or matched portals (exit at the paired portal's height)
    if (this.x - this.radius < 0) {
      const portal = this.vx <= 0 ? this.findLeftPortal(portals) : null
      if (portal) {
        const offsetInPortal = this.y - portal.leftY
        this.x = worldWidth - this.radius - 0.5
        this.y = portal.rightY + offsetInPortal
        this.squash = 0.35
      } else {
        this.x = this.radius
        this.vx = Math.abs(this.vx) * WALL_BOUNCE
        this.squash = 0.6
      }
    } else if (this.x + this.radius > worldWidth) {
      const portal = this.vx >= 0 ? this.findRightPortal(portals) : null
      if (portal) {
        const offsetInPortal = this.y - portal.rightY
        this.x = this.radius + 0.5
        this.y = portal.leftY + offsetInPortal
        this.squash = 0.35
      } else {
        this.x = worldWidth - this.radius
        this.vx = -Math.abs(this.vx) * WALL_BOUNCE
        this.squash = 0.6
      }
    }

    this.collideBumpers(bumpers)
    this.collideArrowPads(arrowPads)

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
          if (p.bonus) {
            p.bonus = false
            result.bonusCollected = true
          }
          break
        }
      }
    }

    this.squash = Math.max(0, this.squash - dt * 4)
    return result
  }
}
