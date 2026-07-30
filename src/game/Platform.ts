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
  COIN_CHANCE,
  COIN_MAX_GAP,
  COIN_MIN_GAP,
  COIN_RADIUS,
  CRUMBLING_PLATFORM_CHANCE,
  MOVING_PLATFORM_AMPLITUDE,
  MOVING_PLATFORM_CHANCE,
  MOVING_PLATFORM_SPEED,
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
  BULLET_PICKUP_SHARE,
  DUAL_PICKUP_SHARE,
  FREE_MOVE_PICKUP_SHARE,
  POW_PICKUP_SHARE,
  UPGRADE_PICKUP_CHANCE,
  UPGRADE_PICKUP_MAX_GAP,
  UPGRADE_PICKUP_MIN_GAP,
  UPGRADE_PICKUP_RADIUS,
} from "./constants"
import type {
  ArrowPadData,
  BumperData,
  CardinalDir,
  CoinData,
  PlatformData,
  PlatformKind,
  PortalData,
  UpgradePickupData,
} from "./types"

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pickPlatformKind(): PlatformKind {
  const r = Math.random()
  if (r < BONUS_PLATFORM_CHANCE) return "bonus"
  if (r < BONUS_PLATFORM_CHANCE + CRUMBLING_PLATFORM_CHANCE) return "crumbling"
  if (r < BONUS_PLATFORM_CHANCE + CRUMBLING_PLATFORM_CHANCE + MOVING_PLATFORM_CHANCE) {
    return "moving"
  }
  return "normal"
}

export class PlatformManager {
  platforms: PlatformData[] = []
  portals: PortalData[] = []
  bumpers: BumperData[] = []
  arrowPads: ArrowPadData[] = []
  upgrades: UpgradePickupData[] = []
  coins: CoinData[] = []
  private nextY = 0
  private nextPortalY = 0
  private nextPortalSide: "left" | "right" = "left"
  private nextBumperY = 0
  private nextArrowY = 0
  private nextUpgradeY = 0
  private nextCoinY = 0
  private worldWidth = 390
  private coinChance = COIN_CHANCE

  reset(
    worldWidth: number,
    slingshotY: number,
    options?: { coinChance?: number },
  ): void {
    this.coinChance = options?.coinChance ?? COIN_CHANCE
    this.worldWidth = worldWidth
    this.platforms = []
    this.portals = []
    this.bumpers = []
    this.arrowPads = []
    this.upgrades = []
    this.coins = []
    this.nextY = slingshotY + 80
    this.nextPortalY = slingshotY + 280
    this.nextPortalSide = Math.random() < 0.5 ? "left" : "right"
    this.nextBumperY = slingshotY + 200
    this.nextArrowY = slingshotY + 240
    this.nextUpgradeY = slingshotY + 360
    this.nextCoinY = slingshotY + 160
    this.spawnInitial(slingshotY)
  }

  private spawnInitial(slingshotY: number): void {
    this.platforms.push({
      x: this.worldWidth * 0.5 - 50,
      y: slingshotY + 100,
      width: 100,
      height: PLATFORM_HEIGHT,
      kind: "normal",
    })
    this.nextY = slingshotY + 100 + rand(PLATFORM_VERTICAL_GAP_MIN, PLATFORM_VERTICAL_GAP_MAX)

    while (this.nextY < slingshotY + 1400) {
      this.spawnOne()
    }
    const initialTop = slingshotY + 1400
    while (this.nextPortalY < initialTop) {
      this.maybeSpawnPortal()
    }
    this.ensurePortalExits(initialTop)
    while (this.nextBumperY < slingshotY + 1400) {
      this.maybeSpawnBumper()
    }
    while (this.nextArrowY < slingshotY + 1400) {
      this.maybeSpawnArrowPad()
    }
    while (this.nextUpgradeY < slingshotY + 1400) {
      this.maybeSpawnUpgrade()
    }
    while (this.nextCoinY < slingshotY + 1400) {
      this.maybeSpawnCoin()
    }
  }

  private spawnOne(): void {
    const width = rand(PLATFORM_MIN_WIDTH, PLATFORM_MAX_WIDTH)
    const kind = pickPlatformKind()
    const amplitude =
      kind === "moving" ? MOVING_PLATFORM_AMPLITUDE : 0
    const minX = PLATFORM_HORIZONTAL_MARGIN + amplitude
    const maxX = Math.max(
      minX,
      this.worldWidth - width - PLATFORM_HORIZONTAL_MARGIN - amplitude,
    )
    const x = rand(minX, maxX)
    const platform: PlatformData = {
      x,
      y: this.nextY,
      width,
      height: PLATFORM_HEIGHT,
      kind,
    }
    if (kind === "moving") {
      platform.originX = x
      platform.phase = Math.random() * Math.PI * 2
      platform.amplitude = MOVING_PLATFORM_AMPLITUDE
      platform.speed = MOVING_PLATFORM_SPEED
    }
    this.platforms.push(platform)
    this.nextY += rand(PLATFORM_VERTICAL_GAP_MIN, PLATFORM_VERTICAL_GAP_MAX)
  }

  /** Advance side-to-side motion before collision checks each frame. */
  updateMovingPlatforms(dt: number): void {
    for (const p of this.platforms) {
      if (p.kind !== "moving" || p.originX == null) continue
      p.phase! += p.speed! * dt
      p.x = p.originX + Math.sin(p.phase!) * p.amplitude!
    }
  }

  private maybeSpawnPortal(): void {
    if (Math.random() < PORTAL_CHANCE) {
      // Spawn an entry and its opposite exit above so the ball never hits a
      // lone portal that can only bounce.
      this.portals.push({
        side: this.nextPortalSide,
        y: this.nextPortalY,
        height: PORTAL_HEIGHT,
      })
      this.nextPortalSide = this.nextPortalSide === "left" ? "right" : "left"
      this.nextPortalY += rand(PORTAL_MIN_GAP, PORTAL_MAX_GAP)

      this.portals.push({
        side: this.nextPortalSide,
        y: this.nextPortalY,
        height: PORTAL_HEIGHT,
      })
      this.nextPortalSide = this.nextPortalSide === "left" ? "right" : "left"
    }
    this.nextPortalY += rand(PORTAL_MIN_GAP, PORTAL_MAX_GAP)
  }

  /**
   * Keep a sentinel exit above the climb so every portal the ball can reach
   * has a higher opposite-side partner to teleport into.
   */
  private ensurePortalExits(beyondY: number): void {
    if (this.portals.length === 0) return

    for (let guard = 0; guard < 64; guard++) {
      let highest = this.portals[0]!
      for (const p of this.portals) {
        if (p.y > highest.y) highest = p
      }
      if (highest.y >= beyondY) {
        this.nextPortalSide = highest.side === "left" ? "right" : "left"
        this.nextPortalY = Math.max(
          this.nextPortalY,
          highest.y + rand(PORTAL_MIN_GAP, PORTAL_MAX_GAP),
        )
        return
      }

      const opposite: "left" | "right" =
        highest.side === "left" ? "right" : "left"
      const exitY = highest.y + rand(PORTAL_MIN_GAP, PORTAL_MAX_GAP)
      this.portals.push({
        side: opposite,
        y: exitY,
        height: PORTAL_HEIGHT,
      })
    }
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

  private pickUpgradeKind(): UpgradePickupData["kind"] | null {
    const r = Math.random()
    let t = BULLET_PICKUP_SHARE
    if (r < t) return "bullets"
    t += FREE_MOVE_PICKUP_SHARE
    if (r < t) return "freeMove"
    t += POW_PICKUP_SHARE
    if (r < t) return "pow"
    t += DUAL_PICKUP_SHARE
    if (r < t) return "dual"
    return null
  }

  private maybeSpawnUpgrade(): void {
    if (Math.random() < UPGRADE_PICKUP_CHANCE) {
      const kind = this.pickUpgradeKind()
      if (kind !== null) {
        const radius = UPGRADE_PICKUP_RADIUS
        const x = rand(
          PLATFORM_HORIZONTAL_MARGIN + radius,
          this.worldWidth - PLATFORM_HORIZONTAL_MARGIN - radius,
        )
        this.upgrades.push({
          x,
          y: this.nextUpgradeY,
          radius,
          kind,
        })
      }
    }
    this.nextUpgradeY += rand(UPGRADE_PICKUP_MIN_GAP, UPGRADE_PICKUP_MAX_GAP)
  }

  private maybeSpawnCoin(): void {
    if (Math.random() < this.coinChance) {
      const radius = COIN_RADIUS
      const x = rand(
        PLATFORM_HORIZONTAL_MARGIN + radius,
        this.worldWidth - PLATFORM_HORIZONTAL_MARGIN - radius,
      )
      this.coins.push({
        x,
        y: this.nextCoinY,
        radius,
      })
    }
    this.nextCoinY += rand(COIN_MIN_GAP, COIN_MAX_GAP)
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
    // Keep the unpaired sentinel exit above the generated playable range.
    this.ensurePortalExits(topNeeded)
    while (this.nextBumperY < topNeeded) {
      this.maybeSpawnBumper()
    }
    while (this.nextArrowY < topNeeded) {
      this.maybeSpawnArrowPad()
    }
    while (this.nextUpgradeY < topNeeded) {
      this.maybeSpawnUpgrade()
    }
    while (this.nextCoinY < topNeeded) {
      this.maybeSpawnCoin()
    }

    this.platforms = this.platforms.filter(
      (p) => p.active !== false && p.y + p.height > killWorldY,
    )
    this.portals = this.portals.filter((p) => p.y + p.height > killWorldY)
    this.bumpers = this.bumpers.filter((b) => b.y + b.radius > killWorldY)
    this.arrowPads = this.arrowPads.filter((a) => a.y + a.radius > killWorldY)
    this.upgrades = this.upgrades.filter((u) => u.y + u.radius > killWorldY)
    this.coins = this.coins.filter((c) => c.y + c.radius > killWorldY)
  }
}
