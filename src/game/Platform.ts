import {
  ARROW_PAD_CHANCE,
  ARROW_PAD_MAX_GAP,
  ARROW_PAD_MIN_GAP,
  ARROW_PAD_RADIUS,
  BONUS_PLATFORM_CHANCE,
  BUMPER_CHANCE,
  BUMPER_MAX_GAP,
  BUMPER_MIN_GAP,
  BUMPER_RADIUS_MAX,
  BUMPER_RADIUS_MIN,
  PLATFORM_HEIGHT,
  PLATFORM_HORIZONTAL_MARGIN,
  PLATFORM_MAX_WIDTH,
  PLATFORM_MIN_WIDTH,
  PLATFORM_VERTICAL_GAP_MAX,
  PLATFORM_VERTICAL_GAP_MIN,
  PORTAL_CHANCE,
  PORTAL_HEIGHT,
  PORTAL_MAX_GAP,
  PORTAL_MIN_GAP,
  PORTAL_PAIR_OFFSET_MAX,
  PORTAL_PAIR_OFFSET_MIN,
  BULLET_PICKUP_SHARE,
  FREE_MOVE_PICKUP_SHARE,
  UPGRADE_PICKUP_CHANCE,
  UPGRADE_PICKUP_MAX_GAP,
  UPGRADE_PICKUP_MIN_GAP,
  UPGRADE_PICKUP_RADIUS,
} from "./constants"
import type {
  ArrowPadData,
  BumperData,
  CardinalDir,
  PlatformData,
  PortalPair,
  UpgradePickupData,
} from "./types"

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export class PlatformManager {
  platforms: PlatformData[] = []
  portals: PortalPair[] = []
  bumpers: BumperData[] = []
  arrowPads: ArrowPadData[] = []
  upgrades: UpgradePickupData[] = []
  private nextY = 0
  private nextPortalY = 0
  private nextBumperY = 0
  private nextArrowY = 0
  private nextUpgradeY = 0
  private worldWidth = 390

  reset(worldWidth: number, slingshotY: number): void {
    this.worldWidth = worldWidth
    this.platforms = []
    this.portals = []
    this.bumpers = []
    this.arrowPads = []
    this.upgrades = []
    this.nextY = slingshotY + 80
    this.nextPortalY = slingshotY + 280
    this.nextBumperY = slingshotY + 200
    this.nextArrowY = slingshotY + 240
    this.nextUpgradeY = slingshotY + 360
    this.spawnInitial(slingshotY)
  }

  private spawnInitial(slingshotY: number): void {
    this.platforms.push({
      x: this.worldWidth * 0.5 - 50,
      y: slingshotY + 100,
      width: 100,
      height: PLATFORM_HEIGHT,
      bonus: false,
    })
    this.nextY = slingshotY + 100 + rand(PLATFORM_VERTICAL_GAP_MIN, PLATFORM_VERTICAL_GAP_MAX)

    while (this.nextY < slingshotY + 1400) {
      this.spawnOne()
    }
    while (this.nextPortalY < slingshotY + 1400) {
      this.maybeSpawnPortal()
    }
    while (this.nextBumperY < slingshotY + 1400) {
      this.maybeSpawnBumper()
    }
    while (this.nextArrowY < slingshotY + 1400) {
      this.maybeSpawnArrowPad()
    }
    while (this.nextUpgradeY < slingshotY + 1400) {
      this.maybeSpawnUpgrade()
    }
  }

  private spawnOne(): void {
    const width = rand(PLATFORM_MIN_WIDTH, PLATFORM_MAX_WIDTH)
    const maxX = Math.max(
      PLATFORM_HORIZONTAL_MARGIN,
      this.worldWidth - width - PLATFORM_HORIZONTAL_MARGIN,
    )
    const x = rand(PLATFORM_HORIZONTAL_MARGIN, maxX)
    this.platforms.push({
      x,
      y: this.nextY,
      width,
      height: PLATFORM_HEIGHT,
      bonus: Math.random() < BONUS_PLATFORM_CHANCE,
    })
    this.nextY += rand(PLATFORM_VERTICAL_GAP_MIN, PLATFORM_VERTICAL_GAP_MAX)
  }

  private maybeSpawnPortal(): void {
    if (Math.random() < PORTAL_CHANCE) {
      const offset =
        rand(PORTAL_PAIR_OFFSET_MIN, PORTAL_PAIR_OFFSET_MAX) *
        (Math.random() < 0.5 ? -1 : 1)
      this.portals.push({
        leftY: this.nextPortalY,
        rightY: this.nextPortalY + offset,
        height: PORTAL_HEIGHT,
      })
    }
    this.nextPortalY += rand(PORTAL_MIN_GAP, PORTAL_MAX_GAP)
  }

  private maybeSpawnBumper(): void {
    if (Math.random() < BUMPER_CHANCE) {
      const radius = rand(BUMPER_RADIUS_MIN, BUMPER_RADIUS_MAX)
      const x = rand(
        PLATFORM_HORIZONTAL_MARGIN + radius,
        this.worldWidth - PLATFORM_HORIZONTAL_MARGIN - radius,
      )
      this.bumpers.push({
        x,
        y: this.nextBumperY,
        radius,
      })
    }
    this.nextBumperY += rand(BUMPER_MIN_GAP, BUMPER_MAX_GAP)
  }

  private maybeSpawnArrowPad(): void {
    if (Math.random() < ARROW_PAD_CHANCE) {
      const radius = ARROW_PAD_RADIUS
      const x = rand(
        PLATFORM_HORIZONTAL_MARGIN + radius,
        this.worldWidth - PLATFORM_HORIZONTAL_MARGIN - radius,
      )
      const dir = Math.floor(Math.random() * 8) as CardinalDir
      this.arrowPads.push({
        x,
        y: this.nextArrowY,
        radius,
        dir,
      })
    }
    this.nextArrowY += rand(ARROW_PAD_MIN_GAP, ARROW_PAD_MAX_GAP)
  }

  private maybeSpawnUpgrade(): void {
    if (Math.random() < UPGRADE_PICKUP_CHANCE) {
      const radius = UPGRADE_PICKUP_RADIUS
      const x = rand(
        PLATFORM_HORIZONTAL_MARGIN + radius,
        this.worldWidth - PLATFORM_HORIZONTAL_MARGIN - radius,
      )
      this.upgrades.push({
        x,
        y: this.nextUpgradeY,
        radius,
        kind: (() => {
          const r = Math.random()
          if (r < BULLET_PICKUP_SHARE) return "bullets"
          if (r < BULLET_PICKUP_SHARE + FREE_MOVE_PICKUP_SHARE) return "freeMove"
          return "dual"
        })(),
      })
    }
    this.nextUpgradeY += rand(UPGRADE_PICKUP_MIN_GAP, UPGRADE_PICKUP_MAX_GAP)
  }

  /**
   * Generate ahead of the camera and cull anything at/below the kill line
   * so platforms (and other props) never appear in the dead zone.
   */
  update(cameraY: number, viewHeight: number, killWorldY: number): void {
    const topNeeded = cameraY + viewHeight * 1.5
    while (this.nextY < topNeeded) {
      this.spawnOne()
    }
    while (this.nextPortalY < topNeeded) {
      this.maybeSpawnPortal()
    }
    while (this.nextBumperY < topNeeded) {
      this.maybeSpawnBumper()
    }
    while (this.nextArrowY < topNeeded) {
      this.maybeSpawnArrowPad()
    }
    while (this.nextUpgradeY < topNeeded) {
      this.maybeSpawnUpgrade()
    }

    this.platforms = this.platforms.filter((p) => p.y + p.height > killWorldY)
    this.portals = this.portals.filter(
      (p) => Math.max(p.leftY, p.rightY) + p.height > killWorldY,
    )
    this.bumpers = this.bumpers.filter((b) => b.y + b.radius > killWorldY)
    this.arrowPads = this.arrowPads.filter((a) => a.y + a.radius > killWorldY)
    this.upgrades = this.upgrades.filter((u) => u.y + u.radius > killWorldY)
  }
}
