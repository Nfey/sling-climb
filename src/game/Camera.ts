import {
  KILL_LINE_OFFSET,
  SLINGSHOT_SCREEN_FRAC,
} from "./constants"
import type { Vec2 } from "./types"

/**
 * Camera keeps the slingshot's world Y locked to a fixed screen midline.
 * World Y increases upward; screen Y increases downward.
 */
export class Camera {
  /** World Y that maps to the slingshot screen line. */
  y = 0
  width = 390
  height = 844
  dpr = 1

  /** Pixel Y of the slingshot / movement line on screen. */
  get slingshotScreenY(): number {
    return this.height * SLINGSHOT_SCREEN_FRAC
  }

  /** Pixel Y of the effective kill line (just below slingshot). */
  get killScreenY(): number {
    return this.slingshotScreenY + KILL_LINE_OFFSET
  }

  /** World Y of the kill line. */
  get killWorldY(): number {
    return this.screenToWorld(0, this.killScreenY).y
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.width = cssWidth
    this.height = cssHeight
    this.dpr = dpr
  }

  /** Lock camera so slingshotWorldY sits on the midline. */
  followSlingshot(slingshotWorldY: number): void {
    this.y = slingshotWorldY
  }

  worldToScreen(p: Vec2): Vec2 {
    return {
      x: p.x,
      y: this.slingshotScreenY - (p.y - this.y),
    }
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: sx,
      y: this.y - (sy - this.slingshotScreenY),
    }
  }
}
