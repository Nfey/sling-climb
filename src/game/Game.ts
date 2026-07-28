import { Ball } from "./Ball"
import { Camera } from "./Camera"
import { PURPLE_BALL_PLATFORM_POINTS } from "./constants"
import { Input } from "./Input"
import { PlatformManager } from "./Platform"
import { Renderer } from "./Renderer"
import { Score } from "./Score"
import { Slingshot } from "./Slingshot"
import type { GameState, Vec2 } from "./types"

export class Game {
  private camera = new Camera()
  private ball = new Ball()
  private bonusBalls: Ball[] = []
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
    this.camera.followSlingshot(this.slingshot.y)
  }

  private resetRun(): void {
    const width = this.camera.width
    this.slingshot.reset(width * 0.5, 0)
    this.ball.reset(this.slingshot.x, this.slingshot.y)
    this.bonusBalls = []
    this.platforms.reset(width, this.slingshot.y)
    this.score.reset(this.slingshot.y)
    this.camera.followSlingshot(this.slingshot.y)
    this.state = "ready"
    this.started = false
    this.elapsed = 0
    this.lastAimPull = null
    this.aimPointerId = null
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

  private update(dt: number): void {
    const presses = this.input.consumePresses()
    const releases = this.input.consumeReleases()

    if (this.aimPointerId != null && releases.includes(this.aimPointerId)) {
      // handled below in aiming
    }

    if (this.state === "gameOver") {
      if (presses.some((p) => p.y < this.camera.killScreenY)) {
        this.resetRun()
      }
      return
    }

    // Bind a play-area press to aiming / moving
    for (const p of presses) {
      if (p.y >= this.camera.killScreenY) continue
      if (this.aimPointerId == null) this.aimPointerId = p.id
    }
    for (const id of releases) {
      if (id === this.aimPointerId) {
        // release handled in state machine via missing pointer
      }
    }

    const pointer = this.primaryPointer()

    if (this.ball.inSlingshot) {
      this.slingshot.frozen = true
      this.ball.x = this.slingshot.x
      this.ball.y = this.slingshot.y

      if (this.state === "ready") {
        if (pointer && pointer.y < this.camera.killScreenY) {
          this.state = "aiming"
          this.started = true
          this.aimPointerId = pointer.id
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

      if (pointer && pointer.y < this.camera.killScreenY) {
        this.slingshot.setX(pointer.x, this.camera.width)
        this.aimPointerId = pointer.id
      } else if (!pointer) {
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
      if (hit.upgradeCollected) this.spawnPurpleBall()
      this.score.observe(this.ball.y)

      this.advanceWorld()

      if (
        pointer &&
        pointer.y < this.camera.killScreenY &&
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

    this.platforms.update(this.camera.y, this.camera.height, this.camera.killWorldY)
    this.camera.followSlingshot(this.slingshot.y)
  }

  private advanceWorld(): void {
    const maxAbove = this.camera.height * 0.32
    if (this.ball.y > this.slingshot.y + maxAbove) {
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

    const holding =
      this.primaryPointer() != null &&
      (this.primaryPointer()?.y ?? 0) < this.camera.killScreenY
    const pulse =
      !this.ball.inSlingshot && holding
        ? 0.55 + Math.sin(this.anim * 6) * 0.25
        : this.ball.inSlingshot
          ? 0.35 + Math.sin(this.anim * 3) * 0.1
          : 0

    this.renderer.drawSlingshot(cam, this.slingshot, pouch, pulse, false)

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
    if (this.state === "flying") return "Hold to move · catch the ball"
    if (this.state === "aiming") return "Release to launch"
    if (this.state === "ready") return "Drag to aim"
    return null
  }
}
