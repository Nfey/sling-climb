import {
  BALL_RADIUS,
  GRAVITY,
  PLATFORM_BOOST,
  WALL_BOUNCE,
} from "./constants"
import type { PlatformData, PortalPair, Vec2 } from "./types"

export interface BallUpdateResult {
  bonusCollected: boolean
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

  reset(x: number, y: number): void {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.inSlingshot = true
    this.squash = 0
  }

  launch(velocity: Vec2): void {
    this.vx = velocity.x
    this.vy = velocity.y
    this.inSlingshot = false
    this.squash = 1
  }

  catchAt(x: number, y: number): void {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.inSlingshot = true
    this.squash = 0.4
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

  /**
   * World Y increases upward. Constant gravity only — no air drag —
   * so arcs stay parabolic and horizontal momentum is preserved.
   */
  update(
    dt: number,
    worldWidth: number,
    platforms: PlatformData[],
    portals: PortalPair[],
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
