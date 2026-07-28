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
  id: number | null
}

export interface PlatformData {
  x: number
  y: number
  width: number
  height: number
  /** Purple bonus platform — awards points once, then turns normal. */
  bonus: boolean
}

/** Matched left/right wall portals (often at different heights). */
export interface PortalPair {
  /** World Y of the left portal band bottom. */
  leftY: number
  /** World Y of the right portal band bottom. */
  rightY: number
  height: number
}

/** Circular bumper that knocks the ball away on contact. */
export interface BumperData {
  x: number
  y: number
  radius: number
}
