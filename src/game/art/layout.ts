/**
 * Left edge of the play area in CSS pixels.
 *
 * Stage 1 keeps this at 0, so wall-flush sprites sit on the same edges the
 * physics already use (x = 0 and x = camera width). Stage 2 draws 30 CSS wall
 * strips in a 20 CSS gutter *outside* this play area — collision stays put,
 * and each strip's inner edge lands on the bounce line. Phone gutters that
 * would shrink the play width are a Stage 2 decision; do not change it here.
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
