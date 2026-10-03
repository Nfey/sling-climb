/**
 * Left edge of the play area in CSS pixels.
 *
 * Stays at 0. Wall-flush sprites and collision use x = 0 and x = camera
 * width. Stage 2 draws the 20 CSS wall body outward into the viewport
 * letterbox (camera.gutter); it does not narrow the playfield.
 */
export const PLAY_LEFT = 0

/** Right edge of the play area. Mirrors {@link PLAY_LEFT}. */
export function playRight(cameraWidth: number): number {
  return cameraWidth - PLAY_LEFT
}

/** Screen X of a left-wall face (turret dome, portal pillar). */
export function wallLeft(inset = 0): number {
  return PLAY_LEFT + inset
}

/** Screen X of a right-wall face. */
export function wallRight(cameraWidth: number, inset = 0): number {
  return playRight(cameraWidth) - inset
}
