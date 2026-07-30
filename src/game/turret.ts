import {
  TURRET_BARREL_LENGTH,
  TURRET_BODY_RADIUS,
} from "./constants"

/** Canvas-space muzzle angle used when drawing the barrel (screen Y down). */
export function turretMuzzleAngle(
  side: "left" | "right",
  aimAngle: number,
): number {
  return side === "left" ? aimAngle : Math.PI - aimAngle
}

/** World-space muzzle tip position and inward unit direction. */
export function turretMuzzleWorld(
  side: "left" | "right",
  aimAngle: number,
  centerX: number,
  centerY: number,
): { x: number; y: number; dirX: number; dirY: number } {
  const angle = turretMuzzleAngle(side, aimAngle)
  const dist = TURRET_BODY_RADIUS + TURRET_BARREL_LENGTH
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  return {
    x: centerX + cosA * dist,
    y: centerY - sinA * dist,
    dirX: cosA,
    dirY: -sinA,
  }
}
