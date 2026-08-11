export type Vec2 = { x: number; y: number }

export type GameState =
  | "menu"
  | "ready"
  | "aiming"
  | "flying"
  | "gameOver"
  | "adEnd"

/** Read-only view of the run for autopilot / tooling. */
export interface GameSnapshot {
  state: GameState
  ball: {
    x: number
    y: number
    vx: number
    vy: number
    inSlingshot: boolean
  }
  slingshot: { x: number; y: number }
  killWorldY: number
  width: number
  height: number
  /** Interesting aim points above the slingshot for seek bots. */
  targets: BotAimTarget[]
  /** Nearby coins the bot may steer away from (menu demo). */
  coins: CoinData[]
  /** When true, the bot nudges aim to miss coins. */
  avoidCoins: boolean
}

/** World-space aim hint used by seek-style autopilots. */
export interface BotAimTarget {
  x: number
  y: number
  kind: "portal" | "bumper" | "arrow" | "bonus"
  /** Higher = preferred when the seek bot picks a target. */
  weight: number
}

/** Axis-aligned hit target in screen space (CSS pixels). */
export interface ScreenRect {
  x: number
  y: number
  w: number
  h: number
}

/** Which overlay is shown while the attract-mode menu is active. */
export type MenuScreen = "title" | "shop" | "daily" | "gacha" | "achievements"

/** Interactive regions on the title menu (Play / Shop / Daily / Gacha / Achievements). */
export interface MainMenuHitAreas {
  play: ScreenRect
  shop: ScreenRect
  daily: ScreenRect
  gacha: ScreenRect
  achievements: ScreenRect
}

/** Interactive regions on the achievements screen. */
export interface AchievementsHitAreas {
  back: ScreenRect
  /** Scrollable grid bounds (for drag-scroll hit testing). */
  list: ScreenRect
  /** Max scroll offset in px (0 when content fits). */
  maxScroll: number
  /** Icon cells for tap-to-inspect. */
  cells: { id: string; rect: ScreenRect }[]
}

/** Floating mid-match achievement unlock toast. */
export interface AchievementToast {
  id: string
  name: string
  icon: string
  /** Seconds remaining. */
  life: number
  duration: number
}

/** Interactive regions on the daily login screen. */
export interface DailyHitAreas {
  back: ScreenRect
  claim: ScreenRect | null
  /** Claim buttons for today's missions (null when not claimable). */
  missionClaims: (ScreenRect | null)[]
}

/** Interactive regions on the hat gacha screen. */
export interface GachaHitAreas {
  back: ScreenRect
  pull: ScreenRect
  hatPrev: ScreenRect
  hatNext: ScreenRect
}

/** Interactive regions on the cosmetics shop screen. */
export interface ShopHitAreas {
  back: ScreenRect
  slingshotPrev: ScreenRect
  slingshotNext: ScreenRect
  slingshotPicker: ScreenRect
  backgroundPrev: ScreenRect
  backgroundNext: ScreenRect
  backgroundPicker: ScreenRect
  ballPrev: ScreenRect
  ballNext: ScreenRect
  ballPicker: ScreenRect
  buySlingshot: ScreenRect | null
  buyBackground: ScreenRect | null
}

export interface PointerState {
  down: boolean
  x: number
  y: number
  startX: number
  startY: number
  id: number
}

export type PlatformKind = "normal" | "bonus" | "crumbling" | "moving"

export interface PlatformData {
  x: number
  y: number
  width: number
  height: number
  kind: PlatformKind
  /** Grey crumbling platforms are removed after the first bounce. */
  active?: boolean
  /** Moving platforms oscillate around this X center. */
  originX?: number
  phase?: number
  amplitude?: number
  speed?: number
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

/** Pass-through gold coin — banked into a lifetime total across runs. */
export interface CoinData {
  x: number
  y: number
  radius: number
}

/** Cosmetic pellet that travels along a fork beam (no physics). */
export interface BulletData {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

/** Wall-mounted cannon that sweeps its barrel and fires slow shots inward. */
export interface WallTurretData {
  side: "left" | "right"
  /** World Y of the turret center. */
  y: number
  /** Current barrel sweep angle (radians, canvas rotation from the wall). */
  aimAngle: number
  /** Sweep phase accumulator (radians). */
  phase: number
  /** Per-turret phase offset so groups don't move in lockstep. */
  phaseOffset: number
  /** Seconds until the next shot. */
  fireCooldown: number
}

/** Slow red projectile fired by a wall turret. */
export interface TurretShotData {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

/** Floating score label that rises and fades above a scoring event. */
export interface ScorePopup {
  x: number
  y: number
  /** Seconds remaining. */
  life: number
  /** Full lifetime used for fade / rise (seconds). */
  duration: number
  text: string
  /** CSS color for the popup text. */
  color: string
}
