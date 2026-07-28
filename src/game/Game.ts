import { Ball } from "./Ball"
import { Camera } from "./Camera"
import {
  BULLET_FIRE_INTERVAL,
  BULLET_LIFETIME,
  BULLET_POWER_DURATION,
  BULLET_PUSH,
  BULLET_PUSH_UP,
  BULLET_RADIUS,
  BULLET_SPEED,
  FREE_MOVE_DURATION,
  PURPLE_BALL_PLATFORM_POINTS,
  SLINGSHOT_FORK_WIDTH,
} from "./constants"
import { Input } from "./Input"
import { PlatformManager } from "./Platform"
import { Renderer } from "./Renderer"
import { Score } from "./Score"
import { Slingshot } from "./Slingshot"
import type { BulletData, GameState, Vec2 } from "./types"

export class Game {
  private camera = new Camera()
  private ball = new Ball()
  private bonusBalls: Ball[] = []
  private bullets: BulletData[] = []
  private slingshot = new Slingshot()
  private platforms = new PlatformManager()
  private score = new Score()
  private input: Input
  private renderer: Renderer
  private canvas: HTMLCanvasElement

  private state: GameState = "ready"
  private started = false
  private anim = 0
  private elapsed = 0
  private lastTime = 0
  private running = false
  private lastAimPull: Vec2 | null = null
  private aimPointerId: number | null = null
  /** Seconds remaining of fork-bullet volley powerup. */
  private bulletPowerRemaining = 0
  private bulletFireCooldown = 0
  /** Seconds remaining of free XY slingshot movement. */
  private freeMoveRemaining = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.input = new Input(canvas)
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

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
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
    }
    if (!this.freeMoveActive) {
      this.camera.followSlingshot(this.slingshot.y)
    }
  }

  private resetRun(): void {
    const width = this.camera.width
    this.slingshot.reset(width * 0.5, 0)
    this.ball.reset(this.slingshot.x, this.slingshot.y)
    this.bonusBalls = []
    this.bullets = []
    this.platforms.reset(width, this.slingshot.y)
    this.score.reset(this.slingshot.y)
    this.camera.followSlingshot(this.slingshot.y)
    this.camera.reset()
    this.state = "ready"
    this.started = false
    this.elapsed = 0
    this.lastAimPull = null
    this.aimPointerId = null
    this.bulletPowerRemaining = 0
    this.bulletFireCooldown = 0
    this.freeMoveRemaining = 0
  }

  private frame(now: number): void {
    if (!this.running) return
    const dt = Math.min(0.033, (now - this.lastTime) / 1000)
    this.lastTime = now
    this.anim += dt

    this.update(dt)
    if (this.started && this.state !== "gameOver") {
      this.elapsed += dt
    }
    this.draw(dt)

    requestAnimationFrame((t) => this.frame(t))
  }

  private spawnPurpleBall(): void {
    const b = new Ball()
    const angle = (Math.random() - 0.5) * 0.8
    const speed = 700
    b.spawnBonus(
      this.ball.x,
      this.ball.y + 8,
      Math.sin(angle) * speed * 0.45 + this.ball.vx * 0.25,
      Math.max(500, Math.abs(this.ball.vy) * 0.35 + speed * 0.55),
    )
    this.bonusBalls.push(b)
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
          if (this.lastAimPull && Math.hypot(this.lastAimPull.x, this.lastAimPull.y) > 8) {
            const vel = this.slingshot.launchVelocity(this.lastAimPull)
            this.ball.x = this.slingshot.x
            this.ball.y = this.slingshot.y
            this.ball.launch(vel)
            this.state = "flying"
            this.slingshot.frozen = false
            this.slingshot.stretch = 0
          } else {
            this.state = "ready"
            this.slingshot.stretch = 0
          }
          this.lastAimPull = null
          this.aimPointerId = null
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

      if (pointer) {
        this.moveSlingshotToPointer(pointer.x, pointer.y)
        this.aimPointerId = pointer.id
      } else {
        this.aimPointerId = null
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
      if (hit.bonusCollected) this.score.collectBonus()
      if (hit.upgradeCollected === "dual") this.spawnPurpleBall()
      if (hit.upgradeCollected === "bullets") {
        this.bulletPowerRemaining = BULLET_POWER_DURATION
        this.bulletFireCooldown = 0
      }
      if (hit.upgradeCollected === "freeMove") {
        this.freeMoveRemaining = FREE_MOVE_DURATION
      }
      if (hit.portalDeltaY !== 0) {
        // Keep slingshot locked relative to the ball, cancel the screen pop,
        // then ease the camera into the new height.
        this.slingshot.y += hit.portalDeltaY
        if (this.freeMoveActive) {
          this.camera.y += hit.portalDeltaY
        }
        this.camera.applyPortalJump(hit.portalDeltaY)
      }
      this.score.observe(this.ball.y)

      this.advanceWorld()

      if (
        pointer &&
        this.ball.vy <= 0 &&
        this.slingshot.canCatch(this.ball.x, this.ball.y)
      ) {
        this.ball.catchAt(this.slingshot.x, this.slingshot.y)
        this.slingshot.frozen = true
        this.state = "aiming"
        this.started = true
        this.lastAimPull = null
        this.aimPointerId = pointer.id
      }

      if (
        !this.ball.inSlingshot &&
        this.ball.vy <= 0 &&
        this.ball.y < this.camera.killWorldY
      ) {
        this.score.commitHighScore()
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
        this.score.collectBonus(PURPLE_BALL_PLATFORM_POINTS)
      }
      // Despawn far below for cleanup only — does not end the run
      if (b.y < killY - this.camera.height) {
        this.bonusBalls.splice(i, 1)
      }
    }

    this.updateBulletPower(dt)

    this.platforms.update(this.camera.viewY, this.camera.height, this.camera.killWorldY)
    if (!this.freeMoveActive) {
      this.camera.followSlingshot(this.slingshot.y)
    }
    this.camera.update(dt)
  }

  /** Unit directions along the Y-fork arms (world space, Y up). */
  private forkDirections(): { left: Vec2; right: Vec2 } {
    const half = SLINGSHOT_FORK_WIDTH * 0.5
    // From pouch toward each fork tip
    const leftLen = Math.hypot(-half, 8)
    const rightLen = Math.hypot(half, 8)
    return {
      left: { x: -half / leftLen, y: 8 / leftLen },
      right: { x: half / rightLen, y: 8 / rightLen },
    }
  }

  private fireForkBullets(): void {
    const { left, right } = this.forkDirections()
    const leftFork = this.slingshot.leftFork
    const rightFork = this.slingshot.rightFork
    this.bullets.push({
      x: leftFork.x,
      y: leftFork.y,
      vx: left.x * BULLET_SPEED,
      vy: left.y * BULLET_SPEED,
      radius: BULLET_RADIUS,
      life: BULLET_LIFETIME,
    })
    this.bullets.push({
      x: rightFork.x,
      y: rightFork.y,
      vx: right.x * BULLET_SPEED,
      vy: right.y * BULLET_SPEED,
      radius: BULLET_RADIUS,
      life: BULLET_LIFETIME,
    })
  }

  private pushBallWithBullet(ball: Ball, bullet: BulletData, dt: number): void {
    const dx = ball.x - bullet.x
    const dy = ball.y - bullet.y
    const dist = Math.hypot(dx, dy) || 1
    const nx = dx / dist
    const ny = dy / dist
    const overlap = ball.radius + bullet.radius - dist
    if (overlap > 0) {
      // Soft separation — avoid hard teleports
      ball.x += nx * overlap * 0.4
      ball.y += ny * overlap * 0.4
    }
    // Gentle continuous shove while inside the stream
    ball.vx += nx * BULLET_PUSH * dt
    if (ball.vy < 0) {
      ball.vy *= Math.exp(-12 * dt)
    }
    // Prefer upward support from the volley (still a bit of radial Y)
    ball.vy += (Math.max(0, ny) * BULLET_PUSH + BULLET_PUSH_UP) * dt
    ball.squash = Math.max(ball.squash, 0.35)
  }

  private updateBulletPower(dt: number): void {
    if (this.bulletPowerRemaining > 0 && this.state !== "gameOver") {
      this.bulletPowerRemaining = Math.max(0, this.bulletPowerRemaining - dt)
      this.bulletFireCooldown -= dt
      while (this.bulletFireCooldown <= 0 && this.bulletPowerRemaining > 0) {
        this.fireForkBullets()
        this.bulletFireCooldown += BULLET_FIRE_INTERVAL
      }
    }

    const width = this.camera.width
    const killY = this.camera.killWorldY
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!
      b.life -= dt
      b.x += b.vx * dt
      b.y += b.vy * dt

      // First side-wall touch removes the bullet (no bounce)
      if (b.x - b.radius < 0 || b.x + b.radius > width) {
        this.bullets.splice(i, 1)
        continue
      }

      if (!this.ball.inSlingshot) {
        const dist = Math.hypot(this.ball.x - b.x, this.ball.y - b.y)
        if (dist < this.ball.radius + b.radius) {
          this.pushBallWithBullet(this.ball, b, dt)
        }
      }
      for (const bonus of this.bonusBalls) {
        const dist = Math.hypot(bonus.x - b.x, bonus.y - b.y)
        if (dist < bonus.radius + b.radius) {
          this.pushBallWithBullet(bonus, b, dt)
        }
      }

      if (b.life <= 0 || b.y < killY - 40) {
        this.bullets.splice(i, 1)
      }
    }
  }

  private advanceWorld(): void {
    const maxAbove = this.camera.height * 0.32
    if (this.freeMoveActive) {
      if (this.ball.y > this.camera.y + maxAbove) {
        this.camera.y = this.ball.y - maxAbove
      }
    } else if (this.ball.y > this.slingshot.y + maxAbove) {
      this.slingshot.y = this.ball.y - maxAbove
    }
  }

  private draw(dt: number): void {
    const cam = this.camera
    this.renderer.begin(cam, dt)
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
        trajVel = this.slingshot.launchVelocity(pull)
      }
    }

    const holding = this.primaryPointer() != null
    const pulse =
      !this.ball.inSlingshot && holding
        ? 0.55 + Math.sin(this.anim * 6) * 0.25
        : this.ball.inSlingshot
          ? 0.35 + Math.sin(this.anim * 3) * 0.1
          : 0

    this.renderer.drawSlingshot(cam, this.slingshot, pouch, pulse, this.freeMoveActive)

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

    this.renderer.drawHud(cam, this.score.current, this.elapsed, this.tipForState())

    if (this.state === "gameOver") {
      this.renderer.drawGameOver(cam, this.score.current, this.score.highScore)
    }
  }

  private tipForState(): string | null {
    if (this.state === "gameOver") return null
    if (!this.started) return "Hold & drag to aim · release to fire"
    if (this.freeMoveActive && this.state === "flying") {
      return `Free move · ${Math.ceil(this.freeMoveRemaining)}s`
    }
    if (this.state === "flying") return "Hold to move · catch the ball"
    if (this.state === "aiming") return "Release to launch"
    if (this.state === "ready") return "Drag to aim"
    return null
  }
}
