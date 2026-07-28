import {
  LAUNCH_POWER,
  MAX_PULL,
  SLINGSHOT_CATCH_RADIUS,
  SLINGSHOT_FORK_HEIGHT,
  SLINGSHOT_FORK_WIDTH,
} from "./constants"
import type { Vec2 } from "./types"

export class Slingshot {
  x = 0
  /** World Y of the pouch / ball rest point. Fixed in world; camera keeps it mid-screen. */
  y = 0
  frozen = true
  /** 0..1 stretch visual when aiming */
  stretch = 0

  reset(x: number, y: number): void {
    this.x = x
    this.y = y
    this.frozen = true
    this.stretch = 0
  }

  setX(x: number, worldWidth: number): void {
    const half = SLINGSHOT_FORK_WIDTH * 0.5
    this.x = Math.max(half + 8, Math.min(worldWidth - half - 8, x))
  }

  /** Place the pouch at a world point, clamped horizontally and within a Y range. */
  setPosition(
    x: number,
    y: number,
    worldWidth: number,
    minY: number,
    maxY: number,
  ): void {
    this.setX(x, worldWidth)
    this.y = Math.max(minY, Math.min(maxY, y))
  }

  canCatch(ballX: number, ballY: number): boolean {
    const dx = ballX - this.x
    const dy = ballY - this.y
    return dx * dx + dy * dy <= SLINGSHOT_CATCH_RADIUS * SLINGSHOT_CATCH_RADIUS
  }

  /**
   * Pull the pouch toward the finger in world space.
   * Launch velocity is opposite the pull (classic slingshot).
   */
  getPull(
    pointerX: number,
    pointerY: number,
    screenToWorld: (sx: number, sy: number) => Vec2,
  ): {
    pull: Vec2
    power: number
  } {
    const finger = screenToWorld(pointerX, pointerY)
    let worldDx = finger.x - this.x
    let worldDy = finger.y - this.y

    const len = Math.hypot(worldDx, worldDy)
    if (len > MAX_PULL && len > 0) {
      worldDx = (worldDx / len) * MAX_PULL
      worldDy = (worldDy / len) * MAX_PULL
    }
    const power = Math.min(1, Math.hypot(worldDx, worldDy) / MAX_PULL)
    return { pull: { x: worldDx, y: worldDy }, power }
  }

  launchVelocity(pull: Vec2): Vec2 {
    return {
      x: -pull.x * LAUNCH_POWER,
      y: -pull.y * LAUNCH_POWER,
    }
  }

  get leftFork(): Vec2 {
    return { x: this.x - SLINGSHOT_FORK_WIDTH * 0.5, y: this.y + 8 }
  }

  get rightFork(): Vec2 {
    return { x: this.x + SLINGSHOT_FORK_WIDTH * 0.5, y: this.y + 8 }
  }

  get base(): Vec2 {
    return { x: this.x, y: this.y - SLINGSHOT_FORK_HEIGHT * 0.55 }
  }
}
