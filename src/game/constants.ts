export const GRAVITY = 2200
export const BALL_RADIUS = 14
export const WALL_BOUNCE = 0.85
/** Fixed upward boost when landing on a platform from above (px/s). */
export const PLATFORM_BOOST = 1100

export const SLINGSHOT_CATCH_RADIUS = 36
export const SLINGSHOT_FORK_WIDTH = 44
export const SLINGSHOT_FORK_HEIGHT = 52
/** How long the catch burst / "Caught!" cue lasts (seconds). */
export const CATCH_BURST_DURATION = 0.55

export const MAX_PULL = 140
/** ~1/4 of the previous 34.5 launch multiplier. */
export const LAUNCH_POWER = 8.625

export const PLATFORM_HEIGHT = 14
export const PLATFORM_MIN_WIDTH = 70
export const PLATFORM_MAX_WIDTH = 140
export const PLATFORM_VERTICAL_GAP_MIN = 70
export const PLATFORM_VERTICAL_GAP_MAX = 115
export const PLATFORM_HORIZONTAL_MARGIN = 16
/** |vx| below this on repeated same-platform bounces counts as stuck. */
export const PLATFORM_STUCK_VX = 14
/** Horizontal nudge applied when a vertical bounce loop is detected (px/s). */
export const PLATFORM_STUCK_NUDGE = 55
/** Same-platform near-vertical hits before applying the nudge. */
export const PLATFORM_STUCK_HITS = 2

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
/** Initial upward speed when a 2x purple ball spawns (px/s). */
export const PURPLE_BALL_SPAWN_UP = 920
/** Initial horizontal speed magnitude on 2x spawn; sign is random (px/s). */
export const PURPLE_BALL_SPAWN_SIDE = 480

export const PORTAL_CHANCE = 0.55
export const PORTAL_HEIGHT = 96
/** Vertical gap between successive staggered portals. */
export const PORTAL_MIN_GAP = 140
export const PORTAL_MAX_GAP = 240
/** Base world-Y speed for camera/slingshot catch-up (px/s). */
export const CAMERA_CATCHUP_SPEED = 1600
/** Extra catch-up speed per px the ball is beyond the soft follow target. */
export const CAMERA_CATCHUP_GAP_GAIN = 5
/** Margin from the top of the screen the ball center must stay below (px). */
export const CAMERA_TOP_MARGIN = 20

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
/** Chance a pickup is the bullet volley. 0 = disabled (code kept). */
export const BULLET_PICKUP_SHARE = 0
/** Chance a pickup is free-move (after bullets are ruled out). */
export const FREE_MOVE_PICKUP_SHARE = 0.3
/** Chance a pickup is POW (after bullets + free-move are ruled out). */
export const POW_PICKUP_SHARE = 0.3
/** Seconds the slingshot can be dragged freely in X and Y. */
export const FREE_MOVE_DURATION = 30
/** Seconds the slingshot launches at 2x power. */
export const POW_DURATION = 20
/** Launch strength multiplier while POW is active. */
export const POW_LAUNCH_MULT = 2

export const BULLET_POWER_DURATION = 8
/** Visual pellet spawn rate (gameplay is hitscan, not projectile). */
export const BULLET_FIRE_INTERVAL = 0.055
export const BULLET_SPEED = 920
export const BULLET_RADIUS = 4.5
/** Half-width of each fork hitscan beam (world px). */
export const BULLET_BEAM_HALF_WIDTH = 26
/** Extra angular pad outside the Y-wedge (radians). */
export const BULLET_WEDGE_PAD = 0.18
/** Gentle sideways accel while inside the beam (px/s²). */
export const BULLET_PUSH = 220
/** Upward accel while inside the beam (px/s²). */
export const BULLET_PUSH_UP = 1600
/** Minimum upward speed enforced while overlapping the beam (px/s). */
export const BULLET_MIN_UP = 620

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
  freeMovePickup: "#0f766e",
  freeMovePickupCore: "#ccfbf1",
  powPickup: "#dc2626",
  powPickupCore: "#fee2e2",
}
