export type Vec2 = { x: number; y: number }

export type GameState =
  | "ready"
  | "aiming"
  | "flying"
  | "gameOver"

export interface PointerState {
  down: boolean
  x: number
  y: number
  startX: number
  startY: number
  id: number
}

export interface PlatformData {
  x: number
  y: number
  width: number
  height: number
  /** Purple bonus platform — awards points once, then turns normal. */
  bonus: boolean
}

/** Staggered single-wall portals — enter one, exit the next portal up on the opposite side. */
export interface PortalData {
  side: "left" | "right"
  /** World Y of the portal band bottom. */
  y: number
  height: number
}

/** Circular bumper that knocks the ball away on contact. */
export interface BumperData {
  x: number
  y: number
  radius: number
}

/**
 * 8 cardinal directions in world space (Y up):
 * 0 N, 1 NE, 2 E, 3 SE, 4 S, 5 SW, 6 W, 7 NW
 */
export type CardinalDir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Circle with an arrow that launches the ball in a fixed direction. */
export interface ArrowPadData {
  x: number
  y: number
  radius: number
  dir: CardinalDir
}

/** Pass-through collectible powerups. */
export interface UpgradePickupData {
  x: number
  y: number
  radius: number
  kind: "dual" | "bullets" | "freeMove" | "pow"
}

/** Cosmetic pellet that travels along a fork beam (no physics). */
export interface BulletData {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

/** Floating score label that rises and fades above a bonus platform. */
export interface ScorePopup {
  x: number
  y: number
  /** Seconds remaining. */
  life: number
  /** Full lifetime used for fade / rise (seconds). */
  duration: number
  text: string
}
