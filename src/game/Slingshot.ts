import {
  AIM_DEADZONE,
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

  canCatch(ballX: number, ballY: number): boolean {
    const dx = ballX - this.x
    const dy = ballY - this.y
    return dx * dx + dy * dy <= SLINGSHOT_CATCH_RADIUS * SLINGSHOT_CATCH_RADIUS
  }

  /**
   * Pull is finger relative to slingshot. Launch velocity is opposite the pull.
   */
  getPull(pointerX: number, pointerY: number, worldToScreen: (p: Vec2) => Vec2): {
    pull: Vec2
    power: number
  } {
    const screen = worldToScreen({ x: this.x, y: this.y })
    let dx = pointerX - screen.x
    let dy = pointerY - screen.y
    // Convert screen pull (Y down) to world pull (Y up): screen dy positive = down = negative world Y
    let worldDx = dx
    let worldDy = -dy

    const len = Math.hypot(worldDx, worldDy)
    if (len > MAX_PULL) {
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

  pastAimDeadzone(pointerX: number, pointerY: number, startX: number, startY: number): boolean {
    const dx = pointerX - startX
    const dy = pointerY - startY
    return dx * dx + dy * dy >= AIM_DEADZONE * AIM_DEADZONE
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
