export const GRAVITY = 2200
export const BALL_RADIUS = 14
export const WALL_BOUNCE = 0.85
/** Fixed upward boost when landing on a platform from above (px/s). */
export const PLATFORM_BOOST = 1100

export const SLINGSHOT_CATCH_RADIUS = 36
export const SLINGSHOT_FORK_WIDTH = 44
export const SLINGSHOT_FORK_HEIGHT = 52

export const MAX_PULL = 140
/** ~1/4 of the previous 34.5 launch multiplier. */
export const LAUNCH_POWER = 8.625

export const PLATFORM_HEIGHT = 14
export const PLATFORM_MIN_WIDTH = 70
export const PLATFORM_MAX_WIDTH = 140
export const PLATFORM_VERTICAL_GAP_MIN = 70
export const PLATFORM_VERTICAL_GAP_MAX = 115
export const PLATFORM_HORIZONTAL_MARGIN = 16

/** Fraction of screen height from the top where the slingshot sits. */
export const SLINGSHOT_SCREEN_FRAC = 2 / 3

/**
 * Kill line sits slightly below the slingshot line.
 * Space below is reserved for future powerups/upgrades.
 */
export const KILL_LINE_OFFSET = 28

export const BONUS_PLATFORM_CHANCE = 0.18
export const BONUS_PLATFORM_POINTS = 50

export const PORTAL_CHANCE = 0.22
export const PORTAL_HEIGHT = 96
export const PORTAL_MIN_GAP = 220
export const PORTAL_MAX_GAP = 420
/** Vertical offset range between matched left/right portals. */
export const PORTAL_PAIR_OFFSET_MIN = 40
export const PORTAL_PAIR_OFFSET_MAX = 140

export const HIGH_SCORE_KEY = "sling-climb-high-score"

export const COLORS = {
  skyTop: "#ffffff",
  skyMid: "#ffffff",
  skyBottom: "#ffffff",
  reserved: "rgba(0, 0, 0, 0.04)",
  reservedLine: "rgba(0, 0, 0, 0.12)",
  platform: "#c4a574",
  platformEdge: "#8b6b3f",
  platformBonus: "#8b5cf6",
  platformBonusEdge: "#6d28d9",
  ball: "#f0d9a0",
  ballStroke: "#d4b06a",
  slingshot: "#2f6fed",
  band: "#1d4fbf",
  trajectory: "rgba(47, 111, 237, 0.75)",
  ink: "#111111",
  inkDim: "rgba(17, 17, 17, 0.55)",
  accent: "#2f6fed",
  wall: "rgba(0,0,0,0.03)",
  overlay: "rgba(255, 255, 255, 0.72)",
  portal: "#12b5a8",
  portalGlow: "rgba(18, 181, 168, 0.35)",
  portalCore: "#e6fffb",
}
