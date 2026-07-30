import { Ball } from "./Ball"
import { Camera } from "./Camera"
import {
  BULLET_BEAM_HALF_WIDTH,
  BULLET_FIRE_INTERVAL,
  BULLET_MIN_UP,
  BULLET_POWER_DURATION,
  BULLET_PUSH,
  BULLET_PUSH_UP,
  BULLET_RADIUS,
  BULLET_SPEED,
  BULLET_WEDGE_PAD,
  CAMERA_CATCHUP_GAP_GAIN,
  CAMERA_CATCHUP_SPEED,
  CAMERA_PORTAL_CATCHUP_SPEED,
  CAMERA_TOP_MARGIN,
  CATCH_BURST_DURATION,
  FREE_MOVE_DURATION,
  BONUS_PLATFORM_POINTS,
  DESKTOP_HINT_MIN_WIDTH,
  TIP_HIDE_CLIMB_HEIGHT,
  MAX_PULL,
  MENU_DEMO_COIN_CHANCE,
  PLAYFIELD_MAX_WIDTH,
  POW_DURATION,
  POW_LAUNCH_MULT,
  PURPLE_BALL_PLATFORM_POINTS,
  PURPLE_BALL_SPAWN_SIDE,
  PURPLE_BALL_SPAWN_UP,
  HAZARD_BONUS_POINTS,
  SCORE_POPUP_DURATION,
  SLINGSHOT_FORK_WIDTH,
  SLINGSHOT_KEYBOARD_SPEED,
  COLORS,
} from "./constants"
import {
  DEFAULT_MASTER_VOLUME,
  GameAudio,
  MENU_DEMO_MASTER_VOLUME,
} from "./Audio"
import { BotController, type BotGameApi } from "./BotController"
import { defaultConfig, type GameConfig } from "./config"
import { Input } from "./Input"
import { PlatformManager } from "./Platform"
import { Renderer, hitRect } from "./Renderer"
import { Score } from "./Score"
import { Slingshot } from "./Slingshot"
import {
  CosmeticsStore,
  DEFAULT_COSMETIC_ID,
} from "./cosmetics"
import type {
  BulletData,
  BotAimTarget,
  CoinData,
  GameSnapshot,
  GameState,
  MainMenuHitAreas,
  ScorePopup,
  Vec2,
} from "./types"

export type FrameController = { update(dt: number, game: BotGameApi): void }

export class Game implements BotGameApi {
  private camera = new Camera()
  private ball = new Ball()
  private bonusBalls: Ball[] = []
  private bullets: BulletData[] = []
  private slingshot = new Slingshot()
  private score: Score
  private cosmetics: CosmeticsStore
  private platforms = new PlatformManager()
  private audio = new GameAudio()
  private input: Input
  private renderer: Renderer
  private canvas: HTMLCanvasElement
  private config: GameConfig
  private controller: FrameController | null = null
  /** Perfect-seek autopilot used only as a silent main-menu backdrop. */
  private menuDemoBot: BotController | null = null
  /**
   * When true, a bot run simulates under the title overlay.
   * Demo score never commits to the player's high-score records.
   */
  private menuDemo = false
  /** Hit regions from the previous menu draw pass (screen space). */
  private menuHitAreas: MainMenuHitAreas | null = null

  private state: GameState = "menu"
  private started = false
  private anim = 0
  private lastTime = 0
  private running = false
  private lastAimPull: Vec2 | null = null
  private aimPointerId: number | null = null
  /** True while bot/script drives aim without a real pointer. */
  private scriptedAim = false
  /** Seconds remaining of fork-bullet volley powerup. */
  private bulletPowerRemaining = 0
  private bulletFireCooldown = 0
  /** Seconds remaining of free XY slingshot movement. */
  private freeMoveRemaining = 0
  /** Seconds remaining of 2x slingshot launch power. */
  private powRemaining = 0
  /** Catch feedback burst timer (seconds remaining). */
  private catchBurst = 0
  /** Floating "+100" labels from purple bonus platforms. */
  private scorePopups: ScorePopup[] = []
  /**
   * Soft-follow distance still owed to a portal teleport.
   * Paid down slowly so portal exits stay readable; launch/POW gaps use fast follow.
   */
  private portalCatchupRemaining = 0
  /** World Y when the current flight started (launch or after catch). */
  private flightStartY = 0
  /** Elapsed seconds in the current playable session. */
  private sessionElapsed = 0
  private sessionEnded = false

  constructor(canvas: HTMLCanvasElement, config: Partial<GameConfig> = {}) {
    this.canvas = canvas
    this.config = defaultConfig(config)
    this.score = new Score(this.config.persistScores !== false)
    this.cosmetics = new CosmeticsStore(this.config.persistScores !== false)
    // Unlock audio inside the real gesture handlers (pointer/key), not rAF.
    this.input = new Input(
      canvas,
      () => this.audio.unlock(),
      (id) => this.onPointerEnd(id),
    )
    this.renderer = new Renderer(canvas)
    this.resize()
    window.addEventListener("resize", () => this.resize())
    window.addEventListener("orientationchange", () => this.resize())
  }

  get autoRestart(): boolean {
    return this.config.autoRestart === true || this.menuDemo
  }

  get mode(): GameConfig["mode"] {
    return this.config.mode
  }

  setController(controller: FrameController | null): void {
    this.controller = controller
  }

  snapshot(): GameSnapshot {
    return {
      state: this.state,
      ball: {
        x: this.ball.x,
        y: this.ball.y,
        vx: this.ball.vx,
        vy: this.ball.vy,
        inSlingshot: this.ball.inSlingshot,
      },
      slingshot: { x: this.slingshot.x, y: this.slingshot.y },
      killWorldY: this.camera.killWorldY,
      width: this.camera.width,
      height: this.camera.height,
      targets: this.collectBotTargets(),
      coins: this.collectBotCoins(),
      avoidCoins: this.menuDemo,
    }
  }

  /** Coins near the slingshot for menu-demo bot avoidance. */
  private collectBotCoins(): CoinData[] {
    if (!this.menuDemo) return []
    const slingY = this.slingshot.y
    const maxY = slingY + this.camera.height * 1.5
    return this.platforms.coins.filter((c) => c.y > slingY - 30 && c.y <= maxY)
  }

  /** Nearby hazards / bonuses above the pouch for seek-style bots. */
  private collectBotTargets(): BotAimTarget[] {
    const slingY = this.slingshot.y
    const maxY = slingY + this.camera.height * 1.35
    const width = this.camera.width
    const out: BotAimTarget[] = []

    for (const p of this.platforms.portals) {
      const midY = p.y + p.height * 0.5
      if (midY <= slingY + 50 || midY > maxY) continue
      out.push({
        x: p.side === "left" ? 18 : width - 18,
        y: midY,
        kind: "portal",
        weight: 4,
      })
    }
    for (const b of this.platforms.bumpers) {
      if (b.y <= slingY + 40 || b.y > maxY) continue
      out.push({ x: b.x, y: b.y, kind: "bumper", weight: 2.5 })
    }
    for (const a of this.platforms.arrowPads) {
      if (a.y <= slingY + 40 || a.y > maxY) continue
      out.push({ x: a.x, y: a.y, kind: "arrow", weight: 2.2 })
    }
    for (const p of this.platforms.platforms) {
      if (!p.bonus) continue
      const cy = p.y + p.height * 0.5
      if (cy <= slingY + 40 || cy > maxY) continue
      out.push({
        x: p.x + p.width * 0.5,
        y: cy,
        kind: "bonus",
        weight: 1.4,
      })
    }
    return out
  }

  setSlingX(x: number): void {
    this.slingshot.setX(x, this.camera.width)
  }

  beginAimPull(pull: Vec2): void {
    if (!this.ball.inSlingshot) return
    if (this.state !== "ready" && this.state !== "aiming") return
    this.state = "aiming"
    this.started = true
    this.scriptedAim = true
    this.aimPointerId = null
    this.applyPull(pull)
  }

  setAimPull(pull: Vec2): void {
    if (this.state !== "aiming" || !this.ball.inSlingshot) return
    this.scriptedAim = true
    this.applyPull(pull)
  }

  releaseAim(): void {
    if (this.state !== "aiming") return
    this.commitAimRelease()
  }

  restartRun(): void {
    this.resetRun()
  }

  start(): void {
    this.sessionElapsed = 0
    this.sessionEnded = false
    // Normal game opens on an attract-mode menu; bot/playable skip straight in.
    if (this.config.mode === "normal") {
      this.enterMenuDemo()
    } else {
      this.resetRun(false)
    }
    this.running = true
    this.lastTime = performance.now()
    requestAnimationFrame((t) => this.frame(t))
  }

  private applyPull(pull: Vec2): void {
    const len = Math.hypot(pull.x, pull.y)
    const power = Math.min(1, len / MAX_PULL)
    this.lastAimPull = { x: pull.x, y: pull.y }
    this.slingshot.stretch = power
  }

  private get botActive(): boolean {
    return this.controller != null && (this.config.mode === "bot" || this.menuDemo)
  }

  private primaryPointer() {
    const all = this.input.activePointers()
    if (this.aimPointerId != null) {
      const kept = this.input.getPointer(this.aimPointerId)
      if (kept) return kept
    }
    return all[0] ?? null
  }

  private get freeMoveActive(): boolean {
    return this.freeMoveRemaining > 0
  }

  private get powActive(): boolean {
    return this.powRemaining > 0
  }

  private launchMult(): number {
    return this.powActive ? POW_LAUNCH_MULT : 1
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    // Cap playfield width on wide desktops; mobile stays full-bleed.
    const width = Math.min(window.innerWidth, PLAYFIELD_MAX_WIDTH)
    const height = window.innerHeight
    this.canvas.width = Math.floor(width * dpr)
    this.canvas.height = Math.floor(height * dpr)
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.camera.resize(width, height, dpr)

    if (!this.started) {
      this.slingshot.x = width * 0.5
      this.slingshot.y = 0
      this.ball.reset(this.slingshot.x, this.slingshot.y)
    } else {
      this.slingshot.setX(this.slingshot.x, width)
    }
    if (!this.freeMoveActive) {
      this.camera.followSlingshot(this.slingshot.y)
    }
  }

  private resetRun(toMenu = false): void {
    this.audio.resetFlight()
    const width = this.camera.width
    this.slingshot.reset(width * 0.5, 0)
    this.ball.reset(this.slingshot.x, this.slingshot.y)
    this.bonusBalls = []
    this.bullets = []
    this.platforms.reset(width, this.slingshot.y, {
      coinChance: this.menuDemo ? MENU_DEMO_COIN_CHANCE : undefined,
    })
    this.score.reset(this.slingshot.y)
    this.camera.followSlingshot(this.slingshot.y)
    this.state = toMenu ? "menu" : "ready"
    this.started = false
    this.lastAimPull = null
    this.aimPointerId = null
    this.scriptedAim = false
    this.bulletPowerRemaining = 0
    this.bulletFireCooldown = 0
    this.freeMoveRemaining = 0
    this.powRemaining = 0
    this.catchBurst = 0
    this.scorePopups = []
    this.portalCatchupRemaining = 0
    this.flightStartY = 0
  }

  private endPlayableSession(): void {
    if (this.sessionEnded) return
    this.sessionEnded = true
    this.state = "adEnd"
    this.audio.resetFlight()
    this.config.onSessionEnd?.()
  }

  /** Audible perfect-seek backdrop behind the main-menu overlay. */
  private enterMenuDemo(): void {
    this.menuDemo = true
    this.audio.setMasterVolume(MENU_DEMO_MASTER_VOLUME)
    if (!this.menuDemoBot) {
      this.menuDemoBot = new BotController("perfect-seek")
    }
    this.menuDemoBot.reset()
    this.controller = this.menuDemoBot
    this.resetRun(false)
  }

  /** Leave the title menu and enter a fresh playable ready state. */
  private beginFromMenu(): void {
    this.menuDemo = false
    this.controller = null
    this.audio.setMasterVolume(DEFAULT_MASTER_VOLUME)
    this.audio.unlock()
    this.resetRun(false)
  }

  private syncAudioCombo(): void {
    this.audio.setCombo(this.score.combo)
  }

  private beginFlight(launchPower = 0.7): void {
    this.flightStartY = this.ball.y
    this.syncAudioCombo()
    this.audio.setClimb(0)
    this.audio.startFlight()
    this.audio.playLaunch(launchPower)
  }

  /**
   * Finish slingshot aim on pointer release. Runs synchronously from the
   * pointerup handler so launch SFX stay inside the user-gesture stack.
   */
  private commitAimRelease(): void {
    if (this.state !== "aiming" || !this.ball.inSlingshot) return

    if (this.lastAimPull && Math.hypot(this.lastAimPull.x, this.lastAimPull.y) > 8) {
      this.audio.unlock()
      const power = this.slingshot.stretch
      const vel = this.slingshot.launchVelocity(this.lastAimPull, this.launchMult())
      this.ball.x = this.slingshot.x
      this.ball.y = this.slingshot.y
      this.ball.launch(vel)
      this.state = "flying"
      this.slingshot.frozen = false
      this.slingshot.stretch = 0
      this.beginFlight(power)
    } else {
      this.state = "ready"
      this.slingshot.stretch = 0
    }
    this.lastAimPull = null
    this.aimPointerId = null
    this.scriptedAim = false
  }

  /** Pointer lifted — commit aim while still in the browser gesture stack. */
  private onPointerEnd(id: number): void {
    if (this.aimPointerId !== id) return
    this.commitAimRelease()
  }

  private endFlightCatch(): void {
    this.audio.playCatch()
    this.audio.resetFlight()
  }

  private frame(now: number): void {
    if (!this.running) return
    const dt = Math.min(0.033, (now - this.lastTime) / 1000)
    this.lastTime = now
    this.anim += dt

    this.update(dt)
    this.draw(dt)

    requestAnimationFrame((t) => this.frame(t))
  }

  private spawnPurpleBall(): void {
    const b = new Ball()
    const side = Math.random() < 0.5 ? -1 : 1
    b.spawnBonus(
      this.ball.x,
      this.ball.y + 8,
      side * PURPLE_BALL_SPAWN_SIDE + this.ball.vx * 0.15,
      PURPLE_BALL_SPAWN_UP,
    )
    this.bonusBalls.push(b)
  }

  private spawnScorePopup(
    x: number,
    y: number,
    points: number,
    color: string,
  ): void {
    this.scorePopups.push({
      x,
      y,
      life: SCORE_POPUP_DURATION,
      duration: SCORE_POPUP_DURATION,
      text: `+${points}`,
      color,
    })
  }

  private moveSlingshotToPointer(pointerX: number, pointerY: number): void {
    if (this.freeMoveActive) {
      const minScreenY = 56
      const maxScreenY = this.camera.killScreenY - 28
      const sy = Math.max(minScreenY, Math.min(maxScreenY, pointerY))
      const world = this.camera.screenToWorld(pointerX, sy)
      const minY = this.camera.screenToWorld(0, maxScreenY).y
      const maxY = this.camera.screenToWorld(0, minScreenY).y
      this.slingshot.setPosition(
        world.x,
        world.y,
        this.camera.width,
        minY,
        maxY,
      )
    } else {
      this.slingshot.setX(pointerX, this.camera.width)
    }
  }

  /** WASD / arrows while flying — X always; Y only during free-move. */
  private moveSlingshotWithKeyboard(dt: number): void {
    const move = this.input.keyboardMove()
    if (move.x === 0 && move.y === 0) return

    const speed = SLINGSHOT_KEYBOARD_SPEED
    const nextX = this.slingshot.x + move.x * speed * dt

    if (this.freeMoveActive) {
      const minScreenY = 56
      const maxScreenY = this.camera.killScreenY - 28
      const minY = this.camera.screenToWorld(0, maxScreenY).y
      const maxY = this.camera.screenToWorld(0, minScreenY).y
      const nextY = this.slingshot.y + move.y * speed * dt
      this.slingshot.setPosition(nextX, nextY, this.camera.width, minY, maxY)
    } else {
      this.slingshot.setX(nextX, this.camera.width)
    }
  }

  private update(dt: number): void {
    if (this.state === "adEnd") {
      this.input.consumePresses()
      this.input.consumeReleases()
      return
    }

    if (this.config.mode === "playable" && !this.sessionEnded) {
      this.sessionElapsed += dt
      const maxSec = this.config.maxSessionSec ?? 30
      if (this.sessionElapsed >= maxSec) {
        this.score.commitHighScore()
        this.endPlayableSession()
        return
      }
    }

    // Autopilot runs before human input so it owns aim/move this frame.
    if (this.controller) {
      this.controller.update(dt, this)
    }

    // Attract-mode menu: variant buttons, shop, or tap-to-play.
    if (this.menuDemo) {
      const menuPresses = this.input.consumePresses()
      this.input.consumeReleases()
      if (menuPresses.length > 0) {
        const p = menuPresses[0]!
        const areas = this.menuHitAreas

        if (areas) {
          if (hitRect(p.x, p.y, areas.slingshotPrev)) {
            this.cosmetics.cycleSlingshotMenu(-1)
            return
          }
          if (hitRect(p.x, p.y, areas.slingshotNext)) {
            this.cosmetics.cycleSlingshotMenu(1)
            return
          }
          if (hitRect(p.x, p.y, areas.ballPrev)) {
            this.cosmetics.cycleBallMenu(-1)
            return
          }
          if (hitRect(p.x, p.y, areas.ballNext)) {
            this.cosmetics.cycleBallMenu(1)
            return
          }
          if (
            areas.buySlingshot &&
            hitRect(p.x, p.y, areas.buySlingshot)
          ) {
            const id = this.cosmetics.equippedSlingshotId
            if (id !== DEFAULT_COSMETIC_ID) {
              this.cosmetics.purchaseSlingshot(id, (amount) =>
                this.score.spendCoins(amount),
              )
            }
            return
          }
          if (
            hitRect(p.x, p.y, areas.slingshotPicker) ||
            hitRect(p.x, p.y, areas.ballPicker)
          ) {
            return
          }
          if (hitRect(p.x, p.y, areas.play)) {
            this.beginFromMenu()
            return
          }
        }

        this.beginFromMenu()
      }
    }

    const ignoreHuman = this.botActive
    if (ignoreHuman) {
      this.input.consumePresses()
      this.input.consumeReleases()
    }
    const presses = ignoreHuman ? [] : this.input.consumePresses()
    const releases = ignoreHuman ? [] : this.input.consumeReleases()

    if (this.aimPointerId != null && releases.includes(this.aimPointerId)) {
      // handled below in aiming
    }

    if (this.state === "menu") {
      // Legacy idle menu (no attract demo). Tap still starts a run.
      if (presses.length > 0) {
        this.beginFromMenu()
      }
      return
    }

    if (this.state === "gameOver") {
      if (this.config.mode === "playable") {
        this.endPlayableSession()
        return
      }
      if (this.menuDemo) {
        // Bot restarts via controller calling restartRun().
        return
      }
      if (!this.botActive && presses.length > 0) {
        this.enterMenuDemo()
      }
      // Full bot mode restarts via controller calling restartRun().
      return
    }

    if (this.freeMoveRemaining > 0) {
      this.freeMoveRemaining = Math.max(0, this.freeMoveRemaining - dt)
      if (this.freeMoveRemaining <= 0) {
        this.camera.followSlingshot(this.slingshot.y)
      }
    }

    if (this.powRemaining > 0) {
      this.powRemaining = Math.max(0, this.powRemaining - dt)
    }

    if (this.catchBurst > 0) {
      this.catchBurst = Math.max(0, this.catchBurst - dt)
    }

    if (this.scorePopups.length > 0) {
      for (const popup of this.scorePopups) popup.life -= dt
      this.scorePopups = this.scorePopups.filter((p) => p.life > 0)
    }

    // Bind any press to aiming / moving
    for (const p of presses) {
      if (this.aimPointerId == null) this.aimPointerId = p.id
    }

    const pointer = ignoreHuman ? null : this.primaryPointer()

    if (this.ball.inSlingshot) {
      this.slingshot.frozen = true
      this.ball.x = this.slingshot.x
      this.ball.y = this.slingshot.y

      // Only a fresh press starts aiming — a held finger after
      // "tap to play again" must not immediately pull the slingshot.
      if (this.state === "ready" && !this.scriptedAim) {
        const press = presses[0]
        if (press) {
          this.state = "aiming"
          this.started = true
          this.aimPointerId = press.id
        }
      }

      if (this.state === "aiming") {
        if (this.scriptedAim) {
          // Pull already set by beginAimPull / setAimPull.
          if (this.lastAimPull) {
            const len = Math.hypot(this.lastAimPull.x, this.lastAimPull.y)
            this.slingshot.stretch = Math.min(1, len / MAX_PULL)
          }
        } else {
          const ptr =
            this.aimPointerId != null
              ? this.input.getPointer(this.aimPointerId)
              : pointer

          if (!ptr) {
            this.commitAimRelease()
          } else {
            const { pull, power } = this.slingshot.getPull(
              ptr.x,
              ptr.y,
              (sx, sy) => this.camera.screenToWorld(sx, sy),
            )
            this.slingshot.stretch = power
            this.lastAimPull = pull
          }
        }
      }
    } else {
      this.state = "flying"
      this.slingshot.frozen = false

      // Bot already moved sling via setSlingX; humans use pointer/keyboard.
      if (!ignoreHuman) {
        if (pointer) {
          this.moveSlingshotToPointer(pointer.x, pointer.y)
          this.aimPointerId = pointer.id
        } else {
          this.aimPointerId = null
          this.moveSlingshotWithKeyboard(dt)
        }
      }

      const hit = this.ball.update(
        dt,
        this.camera.width,
        this.platforms.platforms,
        this.platforms.portals,
        this.platforms.bumpers,
        this.platforms.arrowPads,
        this.platforms.upgrades,
        this.platforms.coins,
      )
      if (hit.bonusCollected && hit.bonusAt) {
        const awarded = this.score.collectBonus(BONUS_PLATFORM_POINTS)
        this.spawnScorePopup(hit.bonusAt.x, hit.bonusAt.y + 18, awarded, COLORS.platformBonus)
      }
      if (hit.bumperHit) {
        const awarded = this.score.collectBonus(HAZARD_BONUS_POINTS)
        const at = hit.bumperAt ?? { x: this.ball.x, y: this.ball.y }
        this.spawnScorePopup(at.x, at.y + 12, awarded, COLORS.bumper)
        this.score.bumpCombo()
        this.syncAudioCombo()
        this.audio.playBumper()
      }
      if (hit.arrowHit) {
        const awarded = this.score.collectBonus(HAZARD_BONUS_POINTS)
        const at = hit.arrowAt ?? { x: this.ball.x, y: this.ball.y }
        this.spawnScorePopup(at.x, at.y + 12, awarded, COLORS.arrowPad)
        this.audio.playArrow()
      }
      if (hit.platformHit) {
        this.score.bumpCombo()
        this.syncAudioCombo()
        this.audio.playPlatformBounce()
      }
      if (hit.wallHit) this.audio.playWallBounce()
      if (hit.coinsCollected > 0) {
        const added = this.score.addCoins(hit.coinsCollected)
        const at = hit.coinAt ?? { x: this.ball.x, y: this.ball.y }
        this.spawnScorePopup(at.x, at.y + 12, added, COLORS.coin)
        this.audio.playCoin()
      }
      if (hit.upgradeCollected === "dual") {
        this.spawnPurpleBall()
        this.audio.playPowerup()
      }
      if (hit.upgradeCollected === "bullets") {
        this.bulletPowerRemaining = BULLET_POWER_DURATION
        this.bulletFireCooldown = 0
        this.audio.playPowerup()
      }
      if (hit.upgradeCollected === "freeMove") {
        this.freeMoveRemaining = FREE_MOVE_DURATION
        this.audio.playPowerup()
      }
      if (hit.upgradeCollected === "pow") {
        this.powRemaining = POW_DURATION
        this.audio.playPowerup()
      }
      if (hit.portalDeltaY !== 0) {
        const awarded = this.score.collectBonus(HAZARD_BONUS_POINTS)
        this.spawnScorePopup(
          this.ball.x,
          this.ball.y + 24,
          awarded,
          COLORS.portal,
        )
        this.score.bumpCombo()
        this.syncAudioCombo()
        this.audio.playPortal()
        // Queue the soft-follow gap from this teleport for slow camera catch-up.
        const softMaxAbove = this.camera.height * 0.32
        const anchor = this.freeMoveActive ? this.camera.y : this.slingshot.y
        const softGap = Math.max(0, this.ball.y - softMaxAbove - anchor)
        this.portalCatchupRemaining = Math.max(this.portalCatchupRemaining, softGap)
      }
      // Portal teleports the ball immediately; camera/slingshot catch up
      // gradually via advanceWorld so the kill line doesn't jump onto the ball.
      this.score.observe(this.ball.y)

      // Climb drama: peak height gained since this flight started.
      const climb = Math.max(0, this.ball.y - this.flightStartY)
      this.audio.setClimb(climb)
      this.audio.update(dt)

      this.advanceWorld(dt)

      if (this.ball.vy <= 0 && this.slingshot.canCatch(this.ball.x, this.ball.y)) {
        this.ball.catchAt(this.slingshot.x, this.slingshot.y)
        this.slingshot.frozen = true
        this.started = true
        this.lastAimPull = null
        this.scriptedAim = false
        this.catchBurst = CATCH_BURST_DURATION
        this.score.resetCombo()
        this.endFlightCatch()
        // Catch even without a held finger; only enter aim if already holding.
        if (pointer) {
          this.state = "aiming"
          this.aimPointerId = pointer.id
        } else {
          this.state = "ready"
          this.aimPointerId = null
        }
      }

      if (
        !this.ball.inSlingshot &&
        this.ball.vy <= 0 &&
        this.ball.y < this.camera.killWorldY
      ) {
        // Menu attract demo is visual-only — never touch player records.
        if (!this.menuDemo) {
          this.score.commitHighScore()
        }
        this.audio.playGameOver()
        this.audio.resetFlight()
        this.state = "gameOver"
        if (this.config.mode === "playable") {
          this.endPlayableSession()
        }
      }
    }

    // Update purple bonus balls (no game-over on kill line)
    const killY = this.camera.killWorldY
    for (let i = this.bonusBalls.length - 1; i >= 0; i--) {
      const b = this.bonusBalls[i]!
      const hit = b.update(
        dt,
        this.camera.width,
        this.platforms.platforms,
        this.platforms.portals,
        this.platforms.bumpers,
        this.platforms.arrowPads,
        this.platforms.upgrades,
        this.platforms.coins,
      )
      if (hit.platformHit) {
        this.score.collectFlat(PURPLE_BALL_PLATFORM_POINTS)
      }
      // Despawn far below for cleanup only — does not end the run
      if (b.y < killY - this.camera.height) {
        this.bonusBalls.splice(i, 1)
      }
    }

    this.updateBulletPower(dt)

    this.platforms.update(this.camera.y, this.camera.height, this.camera.killWorldY)
    if (!this.freeMoveActive) {
      this.camera.followSlingshot(this.slingshot.y)
    }
  }

  /** Unit directions along the Y-fork arms (world space, Y up). */
  private forkDirections(): { left: Vec2; right: Vec2 } {
    const half = SLINGSHOT_FORK_WIDTH * 0.5
    const leftLen = Math.hypot(-half, 8)
    const rightLen = Math.hypot(half, 8)
    return {
      left: { x: -half / leftLen, y: 8 / leftLen },
      right: { x: half / rightLen, y: 8 / rightLen },
    }
  }

  /** Cosmetics only — gameplay is hitscan along the same rays. */
  private spawnVisualPellets(): void {
    const { left, right } = this.forkDirections()
    const leftFork = this.slingshot.leftFork
    const rightFork = this.slingshot.rightFork
    this.bullets.push({
      x: leftFork.x,
      y: leftFork.y,
      vx: left.x * BULLET_SPEED,
      vy: left.y * BULLET_SPEED,
      radius: BULLET_RADIUS,
    })
    this.bullets.push({
      x: rightFork.x,
      y: rightFork.y,
      vx: right.x * BULLET_SPEED,
      vy: right.y * BULLET_SPEED,
      radius: BULLET_RADIUS,
    })
  }

  private rayHitDistance(
    px: number,
    py: number,
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    maxT: number,
  ): number {
    const wx = px - ox
    const wy = py - oy
    const t = Math.max(0, Math.min(maxT, wx * dx + wy * dy))
    const cx = ox + dx * t
    const cy = oy + dy * t
    return Math.hypot(px - cx, py - cy)
  }

  private beamReach(ox: number, dx: number, worldWidth: number): number {
    if (dx < -1e-6) return Math.max(0, (0 - ox) / dx)
    if (dx > 1e-6) return Math.max(0, (worldWidth - ox) / dx)
    return this.camera.height
  }

  /** True when the ball sits in the Y-wedge or near either fork beam. */
  private ballInBulletBeam(ball: Ball): boolean {
    const { left, right } = this.forkDirections()
    const ox = this.slingshot.x
    const oy = this.slingshot.y
    const dx = ball.x - ox
    const dy = ball.y - oy
    const reach = Math.hypot(dx, dy)
    if (reach < 1) return true

    // Interior of the upward Y wedge (plus a little pad past each arm)
    const aL = Math.atan2(left.y, left.x) + BULLET_WEDGE_PAD
    const aR = Math.atan2(right.y, right.x) - BULLET_WEDGE_PAD
    const a = Math.atan2(dy, dx)
    const inWedge =
      dy >= -ball.radius * 0.35 &&
      a >= aR &&
      a <= aL &&
      reach < this.camera.width * 1.15

    if (inWedge) return true

    const width = this.camera.width
    const leftFork = this.slingshot.leftFork
    const rightFork = this.slingshot.rightFork
    const leftReach = this.beamReach(leftFork.x, left.x, width)
    const rightReach = this.beamReach(rightFork.x, right.x, width)
    const threshold = BULLET_BEAM_HALF_WIDTH + ball.radius
    if (
      this.rayHitDistance(ball.x, ball.y, leftFork.x, leftFork.y, left.x, left.y, leftReach) <
      threshold
    ) {
      return true
    }
    if (
      this.rayHitDistance(
        ball.x,
        ball.y,
        rightFork.x,
        rightFork.y,
        right.x,
        right.y,
        rightReach,
      ) < threshold
    ) {
      return true
    }
    return false
  }

  private supportBallInBeam(ball: Ball, dt: number): void {
    // Soft sideways drift away from the pouch centerline
    const side = Math.sign(ball.x - this.slingshot.x)
    ball.vx += (side === 0 ? (ball.vx >= 0 ? 1 : -1) : side) * BULLET_PUSH * dt
    // Hard floor + lift — ball cannot fall through the hitscan volume
    if (ball.vy < BULLET_MIN_UP) ball.vy = BULLET_MIN_UP
    ball.vy += BULLET_PUSH_UP * dt
    ball.squash = Math.max(ball.squash, 0.35)
  }

  private updateBulletPower(dt: number): void {
    if (this.bulletPowerRemaining > 0 && this.state !== "gameOver" && this.state !== "adEnd") {
      this.bulletPowerRemaining = Math.max(0, this.bulletPowerRemaining - dt)
      this.bulletFireCooldown -= dt
      while (this.bulletFireCooldown <= 0 && this.bulletPowerRemaining > 0) {
        this.spawnVisualPellets()
        this.bulletFireCooldown += BULLET_FIRE_INTERVAL
      }

      // Hitscan support every frame while the power is active
      if (!this.ball.inSlingshot && this.ballInBulletBeam(this.ball)) {
        this.supportBallInBeam(this.ball, dt)
      }
      for (const bonus of this.bonusBalls) {
        if (this.ballInBulletBeam(bonus)) this.supportBallInBeam(bonus, dt)
      }
    }

    // Advance cosmetic pellets only
    const width = this.camera.width
    const killY = this.camera.killWorldY
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.x < -10 || b.x > width + 10 || b.y < killY - 40) {
        this.bullets.splice(i, 1)
      }
    }
  }

  private advanceWorld(dt: number): void {
    // Soft follow keeps the ball near the upper third; hard clamp never lets
    // it cross the top of the screen (important for POW launches).
    // Portal-created gaps ease slowly; launch/POW gaps use the fast follow.
    const softMaxAbove = this.camera.height * 0.32
    const hardMaxAbove =
      this.camera.slingshotScreenY - this.ball.radius - CAMERA_TOP_MARGIN

    const raiseAnchor = (anchorY: number): number => {
      let y = anchorY
      const hardTarget = this.ball.y - hardMaxAbove
      if (y < hardTarget) y = hardTarget

      const softTarget = this.ball.y - softMaxAbove
      if (y >= softTarget) {
        this.portalCatchupRemaining = 0
        return y
      }

      const gap = softTarget - y
      const portalPart = Math.min(gap, this.portalCatchupRemaining)
      const launchPart = gap - portalPart

      let step = 0
      if (portalPart > 0) {
        const portalStep = Math.min(
          portalPart,
          CAMERA_PORTAL_CATCHUP_SPEED * dt,
        )
        step += portalStep
        this.portalCatchupRemaining = Math.max(
          0,
          this.portalCatchupRemaining - portalStep,
        )
      }
      if (launchPart > 0) {
        const launchSpeed =
          CAMERA_CATCHUP_SPEED + launchPart * CAMERA_CATCHUP_GAP_GAIN
        step += Math.min(launchPart, launchSpeed * dt)
      }

      return y + step
    }

    if (this.freeMoveActive) {
      this.camera.y = raiseAnchor(this.camera.y)
    } else {
      this.slingshot.y = raiseAnchor(this.slingshot.y)
    }
  }

  private draw(dt: number): void {
    const cam = this.camera
    this.renderer.begin(cam, dt, this.score.startHeight)
    this.renderer.drawAltitudeMarkers(cam, this.score.startHeight)
    this.renderer.drawMaxHeightLine(
      cam,
      this.score.heightLineWorldY,
      this.score.heightLinePassed,
    )
    this.renderer.drawMilestoneHeightLines(cam, this.score.milestoneLines)
    this.renderer.drawPlatforms(cam, this.platforms.platforms)
    this.renderer.drawBumpers(cam, this.platforms.bumpers, this.anim)
    this.renderer.drawArrowPads(cam, this.platforms.arrowPads, this.anim)
    this.renderer.drawUpgradePickups(cam, this.platforms.upgrades, this.anim)
    this.renderer.drawCoins(cam, this.platforms.coins, this.anim)
    this.renderer.drawPortals(cam, this.platforms.portals, this.anim)
    this.renderer.drawBullets(cam, this.bullets)

    let pouch: Vec2 | null = null
    let trajOrigin: Vec2 | null = null
    let trajVel: Vec2 | null = null

    if (this.state === "aiming") {
      let pull: Vec2 | null = null
      if (this.scriptedAim && this.lastAimPull) {
        pull = this.lastAimPull
      } else {
        const ptr =
          this.aimPointerId != null
            ? this.input.getPointer(this.aimPointerId)
            : this.primaryPointer()
        if (ptr) {
          pull = this.slingshot.getPull(
            ptr.x,
            ptr.y,
            (sx, sy) => this.camera.screenToWorld(sx, sy),
          ).pull
        } else if (this.lastAimPull) {
          pull = this.lastAimPull
        }
      }
      if (pull) {
        pouch = Renderer.pouchFromPull(this.slingshot, pull)
        this.ball.x = pouch.x
        this.ball.y = pouch.y
        trajOrigin = { x: this.slingshot.x, y: this.slingshot.y }
        trajVel = this.slingshot.launchVelocity(pull, this.launchMult())
      }
    }

    const holding = !this.botActive && this.primaryPointer() != null
    const pulse =
      !this.ball.inSlingshot && holding
        ? 0.55 + Math.sin(this.anim * 6) * 0.25
        : this.ball.inSlingshot
          ? 0.35 + Math.sin(this.anim * 3) * 0.1
          : 0

    const slingStyle = this.freeMoveActive ? "freeMove" : this.powActive ? "pow" : "normal"
    const bestHeight = this.score.bestMaxHeight
    const highScore = this.score.highScore
    const slingshotStyle = this.cosmetics.getEquippedSlingshotStyle()
    const ballStyle = this.cosmetics.getEquippedBallStyle(bestHeight, highScore)
    this.renderer.drawSlingshot(
      cam,
      this.slingshot,
      pouch,
      pulse,
      slingStyle,
      slingshotStyle,
    )
    if (this.catchBurst > 0) {
      this.renderer.drawCatchBurst(
        cam,
        this.slingshot,
        this.catchBurst / CATCH_BURST_DURATION,
      )
    }
    this.renderer.drawScorePopups(cam, this.scorePopups)

    if (trajOrigin && trajVel) {
      this.renderer.drawTrajectory(cam, trajOrigin, trajVel)
    }

    for (const b of this.bonusBalls) {
      this.renderer.drawBall(cam, b)
    }
    this.renderer.drawBall(cam, this.ball, ballStyle)

    if (this.menuDemo || this.state === "menu") {
      const slingshotLocked = this.cosmetics.isSlingshotSelectionLocked()
      const ballLocked = this.cosmetics.isBallSelectionLocked(bestHeight, highScore)

      this.menuHitAreas = this.renderer.drawMainMenu(
        cam,
        highScore,
        bestHeight,
        this.score.lifetimeCoins,
        this.anim,
        this.cosmetics.getSelectedSlingshotStyle(),
        this.cosmetics.getSelectedBallStyle(),
        slingshotLocked,
        ballLocked,
        slingshotLocked ? this.cosmetics.previewSlingshotPrice() : null,
        ballLocked ? this.cosmetics.getSelectedBallUnlockHint() : null,
      )
      return
    }

    this.renderer.drawHud(
      cam,
      this.score.current,
      this.score.climbHeight,
      this.tipForState(),
      this.score.combo,
      this.score.highScore,
      this.score.bestMaxHeight,
    )

    if (this.config.mode === "bot") {
      this.renderer.drawBotBadge(cam, this.config.botStyle ?? "perfect")
    }

    if (this.state === "gameOver" || this.state === "adEnd") {
      const hideReplay =
        this.config.mode === "playable" ||
        this.config.mode === "bot" ||
        this.state === "adEnd"
      this.renderer.drawGameOver(
        cam,
        this.score.current,
        this.score.highScore,
        this.score.isNewHighScore,
        this.score.climbHeight,
        this.score.bestMaxHeight,
        this.score.isNewBestHeight,
        this.anim,
        hideReplay ? null : "Tap to continue",
      )
    }
  }

  /** True on desktop-sized viewports where keyboard/mouse hints apply. */
  private isDesktopHint(): boolean {
    return window.matchMedia(`(min-width: ${DESKTOP_HINT_MIN_WIDTH}px)`).matches
  }

  private tipForState(): string | null {
    if (
      this.menuDemo ||
      this.state === "menu" ||
      this.state === "gameOver" ||
      this.state === "adEnd"
    ) {
      return null
    }
    if (this.config.mode === "bot") return null
    if (this.score.climbHeight >= TIP_HIDE_CLIMB_HEIGHT) return null
    if (!this.started) {
      return this.config.mode === "playable"
        ? "Drag to aim · release to fire"
        : "Hold & drag to aim · release to fire"
    }
    if (this.catchBurst > 0) return "Caught!"
    if (this.powActive && (this.state === "aiming" || this.state === "ready")) {
      return `POW · 2x launch · ${Math.ceil(this.powRemaining)}s`
    }
    if (this.freeMoveActive && this.state === "flying") {
      const secs = Math.ceil(this.freeMoveRemaining)
      return this.isDesktopHint()
        ? `Free move · WASD · ${secs}s`
        : `Free move · ${secs}s`
    }
    if (this.powActive && this.state === "flying") {
      return `POW · ${Math.ceil(this.powRemaining)}s`
    }
    if (this.state === "flying") {
      return this.isDesktopHint()
        ? "WASD or hold to move · catch the ball"
        : "Hold to move · catch the ball"
    }
    if (this.state === "aiming") return "Release to launch"
    if (this.state === "ready") return "Drag to aim"
    return null
  }
}
