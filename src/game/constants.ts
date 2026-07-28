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
/** Points awarded when a purple 2x ball lands on any platform. */
export const PURPLE_BALL_PLATFORM_POINTS = 100

export const PORTAL_CHANCE = 0.22
export const PORTAL_HEIGHT = 96
export const PORTAL_MIN_GAP = 220
export const PORTAL_MAX_GAP = 420
/** Vertical offset range between matched left/right portals. */
export const PORTAL_PAIR_OFFSET_MIN = 40
export const PORTAL_PAIR_OFFSET_MAX = 140

export const BUMPER_CHANCE = 0.2
export const BUMPER_RADIUS_MIN = 18
export const BUMPER_RADIUS_MAX = 28
export const BUMPER_MIN_GAP = 160
export const BUMPER_MAX_GAP = 320
/** Extra outward speed added on bumper contact (px/s). */
export const BUMPER_KNOCK = 130

export const ARROW_PAD_CHANCE = 0.24
export const ARROW_PAD_RADIUS = 26
export const ARROW_PAD_MIN_GAP = 180
export const ARROW_PAD_MAX_GAP = 340
/** Speed applied when the ball enters an arrow pad (px/s). */
export const ARROW_PAD_SPEED = 980

export const UPGRADE_PICKUP_CHANCE = 0.2
export const UPGRADE_PICKUP_RADIUS = 22
export const UPGRADE_PICKUP_MIN_GAP = 260
export const UPGRADE_PICKUP_MAX_GAP = 480
/** Chance a pickup is the bullet volley instead of the purple 2x ball. */
export const BULLET_PICKUP_SHARE = 0.45

export const BULLET_POWER_DURATION = 8
export const BULLET_FIRE_INTERVAL = 0.09
export const BULLET_SPEED = 900
export const BULLET_RADIUS = 4.5
export const BULLET_LIFETIME = 2.4
export const BULLET_PUSH = 820
/** Extra upward velocity added on bullet contact (world Y up). */
export const BULLET_PUSH_UP = 320
export const BULLET_WALL_BOUNCE = 0.92
/** Remove a bullet after this many side-wall contacts. */
export const BULLET_MAX_WALL_HITS = 2

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
  ballPurple: "#c4b5fd",
  ballPurpleStroke: "#7c3aed",
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
  bumper: "#ef4444",
  bumperRim: "#b91c1c",
  bumperCore: "#fecaca",
  arrowPad: "#f59e0b",
  arrowPadRim: "#b45309",
  arrowPadCore: "#fef3c7",
  arrow: "#7c2d12",
  upgradePickup: "#7c3aed",
  upgradePickupCore: "#ede9fe",
  bulletPickup: "#ea580c",
  bulletPickupCore: "#ffedd5",
  bullet: "#fb923c",
  bulletCore: "#fff7ed",
}
