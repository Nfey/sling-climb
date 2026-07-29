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
import { GameAudio } from "./Audio"
import { Input } from "./Input"
import { PlatformManager } from "./Platform"
import { Renderer } from "./Renderer"
import { Score } from "./Score"
import { Slingshot } from "./Slingshot"
import type { BulletData, GameState, ScorePopup, Vec2 } from "./types"

export class Game {
  private camera = new Camera()
  private ball = new Ball()
  private bonusBalls: Ball[] = []
  private bullets: BulletData[] = []
  private slingshot = new Slingshot()
  private platforms = new PlatformManager()
  private score = new Score()
  private audio = new GameAudio()
  private input: Input
  private renderer: Renderer
  private canvas: HTMLCanvasElement

  private state: GameState = "ready"
  private started = false
  private anim = 0
  private lastTime = 0
  private running = false
  private lastAimPull: Vec2 | null = null
  private aimPointerId: number | null = null
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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
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

  start(): void {
    this.resetRun()
    this.running = true
    this.lastTime = performance.now()
    requestAnimationFrame((t) => this.frame(t))
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

  private resetRun(): void {
    this.audio.resetFlight()
    const width = this.camera.width
    this.slingshot.reset(width * 0.5, 0)
    this.ball.reset(this.slingshot.x, this.slingshot.y)
    this.bonusBalls = []
    this.bullets = []
    this.platforms.reset(width, this.slingshot.y)
    this.score.reset(this.slingshot.y)
    this.camera.followSlingshot(this.slingshot.y)
    this.state = "ready"
    this.started = false
    this.lastAimPull = null
    this.aimPointerId = null
    this.bulletPowerRemaining = 0
    this.bulletFireCooldown = 0
    this.freeMoveRemaining = 0
    this.powRemaining = 0
    this.catchBurst = 0
    this.scorePopups = []
    this.portalCatchupRemaining = 0
    this.flightStartY = 0
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
    const presses = this.input.consumePresses()
    const releases = this.input.consumeReleases()

    if (this.aimPointerId != null && releases.includes(this.aimPointerId)) {
      // handled below in aiming
    }

    if (this.state === "gameOver") {
      if (presses.length > 0) {
        this.resetRun()
      }
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

    const pointer = this.primaryPointer()

    if (this.ball.inSlingshot) {
      this.slingshot.frozen = true
      this.ball.x = this.slingshot.x
      this.ball.y = this.slingshot.y

      // Only a fresh press starts aiming — a held finger after
      // "tap to play again" must not immediately pull the slingshot.
      if (this.state === "ready") {
        const press = presses[0]
        if (press) {
          this.state = "aiming"
          this.started = true
          this.aimPointerId = press.id
        }
      }

      if (this.state === "aiming") {
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
    } else {
      this.state = "flying"
      this.slingshot.frozen = false

      // Pointer still wins when held; otherwise WASD / arrows move the slingshot.
      if (pointer) {
        this.moveSlingshotToPointer(pointer.x, pointer.y)
        this.aimPointerId = pointer.id
      } else {
        this.aimPointerId = null
        this.moveSlingshotWithKeyboard(dt)
      }

      const hit = this.ball.update(
        dt,
        this.camera.width,
        this.platforms.platforms,
        this.platforms.portals,
        this.platforms.bumpers,
        this.platforms.arrowPads,
        this.platforms.upgrades,
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
        this.score.commitHighScore()
        this.audio.playGameOver()
        this.audio.resetFlight()
        this.state = "gameOver"
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
    if (this.bulletPowerRemaining > 0 && this.state !== "gameOver") {
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
    this.renderer.drawPortals(cam, this.platforms.portals, this.anim)
    this.renderer.drawBullets(cam, this.bullets)

    let pouch: Vec2 | null = null
    let trajOrigin: Vec2 | null = null
    let trajVel: Vec2 | null = null

    if (this.state === "aiming") {
      const ptr =
        this.aimPointerId != null
          ? this.input.getPointer(this.aimPointerId)
          : this.primaryPointer()
      if (ptr) {
        const { pull } = this.slingshot.getPull(
          ptr.x,
          ptr.y,
          (sx, sy) => this.camera.screenToWorld(sx, sy),
        )
        pouch = Renderer.pouchFromPull(this.slingshot, pull)
        this.ball.x = pouch.x
        this.ball.y = pouch.y
        trajOrigin = { x: this.slingshot.x, y: this.slingshot.y }
        trajVel = this.slingshot.launchVelocity(pull, this.launchMult())
      }
    }

    const holding = this.primaryPointer() != null
    const pulse =
      !this.ball.inSlingshot && holding
        ? 0.55 + Math.sin(this.anim * 6) * 0.25
        : this.ball.inSlingshot
          ? 0.35 + Math.sin(this.anim * 3) * 0.1
          : 0

    const slingStyle = this.freeMoveActive ? "freeMove" : this.powActive ? "pow" : "normal"
    this.renderer.drawSlingshot(cam, this.slingshot, pouch, pulse, slingStyle)
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
    this.renderer.drawBall(cam, this.ball)

    if (!this.started && this.state === "ready") {
      this.renderer.drawTitle(cam)
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

    if (this.state === "gameOver") {
      this.renderer.drawGameOver(
        cam,
        this.score.current,
        this.score.highScore,
        this.score.isNewHighScore,
        this.score.climbHeight,
        this.score.bestMaxHeight,
        this.score.isNewBestHeight,
        this.anim,
      )
    }
  }

  /** True on desktop-sized viewports where keyboard/mouse hints apply. */
  private isDesktopHint(): boolean {
    return window.matchMedia(`(min-width: ${DESKTOP_HINT_MIN_WIDTH}px)`).matches
  }

  private tipForState(): string | null {
    if (this.state === "gameOver") return null
    if (!this.started) return "Hold & drag to aim · release to fire"
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
