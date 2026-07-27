import {
  AIR_DRAG,
  BALL_BOUNCE,
  BALL_RADIUS,
  GRAVITY,
  WALL_BOUNCE,
} from "./constants"
import type { PlatformData, Vec2 } from "./types"

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

  /**
   * World Y increases upward. Gravity pulls down (negative Y).
   */
  update(dt: number, worldWidth: number, platforms: PlatformData[]): void {
    if (this.inSlingshot) {
      this.squash = Math.max(0, this.squash - dt * 3)
      return
    }

    this.vy -= GRAVITY * dt
    const speed = Math.hypot(this.vx, this.vy)
    if (speed > 0) {
      const drag = Math.min(0.2, AIR_DRAG * speed * speed * dt)
      this.vx *= 1 - drag
      this.vy *= 1 - drag
    }

    this.x += this.vx * dt
    this.y += this.vy * dt

    // Walls
    if (this.x - this.radius < 0) {
      this.x = this.radius
      this.vx = Math.abs(this.vx) * WALL_BOUNCE
      this.squash = 0.6
    } else if (this.x + this.radius > worldWidth) {
      this.x = worldWidth - this.radius
      this.vx = -Math.abs(this.vx) * WALL_BOUNCE
      this.squash = 0.6
    }

    // One-way platforms: bounce only while falling (vy < 0)
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
          this.vy = Math.abs(this.vy) * BALL_BOUNCE
          this.squash = 0.7
          break
        }
      }
    }

    this.squash = Math.max(0, this.squash - dt * 4)
  }
}
