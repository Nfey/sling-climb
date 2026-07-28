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

/** Matched left/right wall portals at the same world Y band. */
export interface PortalPair {
  /** World Y of the portal band bottom. */
  y: number
  height: number
}
