export const GRAVITY = 2200
export const BALL_RADIUS = 14
export const WALL_BOUNCE = 0.85
/** Fixed upward boost when landing on a platform from above (px/s). */
export const PLATFORM_BOOST = 1100

export const SLINGSHOT_CATCH_RADIUS = 36
export const SLINGSHOT_FORK_WIDTH = 44
export const SLINGSHOT_FORK_HEIGHT = 52

/** Pixels of finger movement required before aiming starts after a catch/load. */
export const AIM_DEADZONE = 10

export const MAX_PULL = 140
/** ~1/4 of the previous 34.5 launch multiplier. */
export const LAUNCH_POWER = 8.625

export const PLATFORM_HEIGHT = 14
export const PLATFORM_MIN_WIDTH = 70
export const PLATFORM_MAX_WIDTH = 140
export const PLATFORM_VERTICAL_GAP_MIN = 70
export const PLATFORM_VERTICAL_GAP_MAX = 115
export const PLATFORM_HORIZONTAL_MARGIN = 16

/** Fraction of screen height where the slingshot midline sits. */
export const SLINGSHOT_SCREEN_FRAC = 0.5

/**
 * Kill line sits slightly below the slingshot line.
 * Space below is reserved for future powerups/upgrades.
 */
export const KILL_LINE_OFFSET = 28

export const HIGH_SCORE_KEY = "sling-climb-high-score"

export const COLORS = {
  skyTop: "#2d5a4a",
  skyMid: "#1a2f28",
  skyBottom: "#0f1a16",
  reserved: "rgba(8, 14, 12, 0.55)",
  reservedLine: "rgba(242, 239, 230, 0.12)",
  platform: "#c4a574",
  platformEdge: "#8b6b3f",
  ball: "#f0d9a0",
  ballStroke: "#d4b06a",
  slingshot: "#5c4030",
  band: "#e07a5f",
  trajectory: "rgba(232, 165, 75, 0.85)",
  ink: "#f2efe6",
  inkDim: "rgba(242, 239, 230, 0.65)",
  accent: "#e8a54b",
  wall: "rgba(255,255,255,0.04)",
}
