import {
  KILL_LINE_OFFSET,
  PORTAL_CAMERA_EASE,
  SLINGSHOT_SCREEN_FRAC,
} from "./constants"
import type { Vec2 } from "./types"

/**
 * Camera keeps the slingshot's world Y locked to a fixed screen midline.
 * World Y increases upward; screen Y increases downward.
 *
 * After a portal height jump, `portalOffset` cancels the visual pop, then
 * eases to 0 so the view pans smoothly to the new height.
 */
export class Camera {
  /** World Y that maps to the slingshot screen line (before portal blend). */
  y = 0
  /**
   * Temporary view offset after portal travel. Added to `y` for rendering /
   * input. Eases toward 0 each frame.
   */
  private portalOffset = 0
  width = 390
  height = 844
  dpr = 1

  /** Effective camera Y used for all screen ↔ world mapping. */
  get viewY(): number {
    return this.y + this.portalOffset
  }

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

  /**
   * Ball just teleported by `deltaY` through a portal. Shift the view offset
   * so the ball stays on-screen, then ease the offset away for a smooth pan.
   */
  applyPortalJump(deltaY: number): void {
    if (deltaY === 0) return
    this.portalOffset -= deltaY
  }

  /** Ease portal offset toward zero. Call once per frame. */
  update(dt: number): void {
    if (this.portalOffset === 0) return
    const t = 1 - Math.exp(-PORTAL_CAMERA_EASE * dt)
    this.portalOffset += (0 - this.portalOffset) * t
    if (Math.abs(this.portalOffset) < 0.05) this.portalOffset = 0
  }

  reset(): void {
    this.portalOffset = 0
  }

  worldToScreen(p: Vec2): Vec2 {
    return {
      x: p.x,
      y: this.slingshotScreenY - (p.y - this.viewY),
    }
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: sx,
      y: this.viewY - (sy - this.slingshotScreenY),
    }
  }
}
