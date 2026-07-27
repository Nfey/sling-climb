import { Ball } from "./Ball"
import { Camera } from "./Camera"
import { Input } from "./Input"
import { PlatformManager } from "./Platform"
import { Renderer } from "./Renderer"
import { Score } from "./Score"
import { Slingshot } from "./Slingshot"
import type { GameState, Vec2 } from "./types"

export class Game {
  private camera = new Camera()
  private ball = new Ball()
  private slingshot = new Slingshot()
  private platforms = new PlatformManager()
  private score = new Score()
  private input: Input
  private renderer: Renderer
  private canvas: HTMLCanvasElement

  private state: GameState = "ready"
  private started = false
  private wasPointerDown = false
  private anim = 0
  private lastTime = 0
  private running = false

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

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = window.innerHeight
    this.canvas.width = Math.floor(width * dpr)
    this.canvas.height = Math.floor(height * dpr)
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.camera.resize(width, height, dpr)

    // Keep slingshot world Y mapped to midline; X stays proportional if first launch
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
    this.platforms.reset(width, this.slingshot.y)
    this.score.reset(this.slingshot.y)
    this.camera.followSlingshot(this.slingshot.y)
    this.state = "ready"
    this.started = false
    this.wasPointerDown = false
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

  private update(dt: number): void {
    const pointer = this.input.pointer
    const justPressed = pointer.down && !this.wasPointerDown
    const justReleased = !pointer.down && this.wasPointerDown

    if (this.state === "gameOver") {
      if (justPressed) {
        this.resetRun()
      }
      this.wasPointerDown = pointer.down
      return
    }

    // --- State transitions & control ---
    if (this.ball.inSlingshot) {
      this.slingshot.frozen = true
      this.ball.x = this.slingshot.x
      this.ball.y = this.slingshot.y

      if (this.state === "ready" || this.state === "catchPending") {
        if (pointer.down) {
          const origin = this.input.aimOrigin()
          if (
            this.slingshot.pastAimDeadzone(
              pointer.x,
              pointer.y,
              origin.x,
              origin.y,
            )
          ) {
            this.state = "aiming"
            this.started = true
          }
        } else if (justReleased && this.state === "catchPending") {
          // Caught but released without aiming — stay ready at this spot
          this.state = "ready"
        }
      }

      if (this.state === "aiming") {
        if (!pointer.down) {
          // Fire
          const { pull } = this.slingshot.getPull(
            pointer.x,
            pointer.y,
            (sx, sy) => this.camera.screenToWorld(sx, sy),
          )
          const power = Math.hypot(pull.x, pull.y)
          if (power > 8) {
            const vel = this.slingshot.launchVelocity(pull)
            // Launch from the rest point so a downward pull doesn't spawn below the kill line
            this.ball.x = this.slingshot.x
            this.ball.y = this.slingshot.y
            this.ball.launch(vel)
            this.state = "flying"
            this.slingshot.frozen = false
            this.slingshot.stretch = 0
          } else {
            this.state = "ready"
            this.ball.x = this.slingshot.x
            this.ball.y = this.slingshot.y
          }
        } else {
          const { power } = this.slingshot.getPull(
            pointer.x,
            pointer.y,
            (sx, sy) => this.camera.screenToWorld(sx, sy),
          )
          this.slingshot.stretch = power
        }
      }
    } else {
      // Flying: move slingshot horizontally while held
      this.state = "flying"
      this.slingshot.frozen = false
      if (pointer.down) {
        this.slingshot.setX(pointer.x, this.camera.width)
      }

      this.ball.update(dt, this.camera.width, this.platforms.platforms)
      this.score.observe(this.ball.y)

      // Camera / world: slingshot stays mid-screen; as peak climbs, raise slingshot world Y
      this.advanceWorld()

      // Catch while finger is held — only when falling so ascent isn't eaten
      if (
        pointer.down &&
        this.ball.vy <= 0 &&
        this.slingshot.canCatch(this.ball.x, this.ball.y)
      ) {
        this.ball.catchAt(this.slingshot.x, this.slingshot.y)
        this.slingshot.frozen = true
        this.input.markCatchAnchor()
        this.state = "catchPending"
      }

      // Game over only when falling past the kill line (not while launching upward
      // through / from near it after a downward pull-back aim).
      if (
        !this.ball.inSlingshot &&
        this.ball.vy <= 0 &&
        this.ball.y < this.camera.killWorldY
      ) {
        this.score.commitHighScore()
        this.state = "gameOver"
      }
    }

    this.platforms.update(this.camera.y, this.camera.height)
    this.camera.followSlingshot(this.slingshot.y)
    this.wasPointerDown = pointer.down
  }

  /**
   * When the ball climbs above the slingshot line, scroll the world up by
   * raising the slingshot's world Y toward the ball's peak so the playfield
   * advances while the slingshot stays visually mid-screen.
   */
  private advanceWorld(): void {
    // Let the ball travel into the upper half; scroll only once it gets too high
    // so the slingshot stays mid-screen and remains catchable on the way down.
    const maxAbove = this.camera.height * 0.32
    if (this.ball.y > this.slingshot.y + maxAbove) {
      this.slingshot.y = this.ball.y - maxAbove
    }
  }

  private draw(dt: number): void {
    const cam = this.camera
    this.renderer.begin(cam, dt)
    this.renderer.drawPlatforms(cam, this.platforms.platforms)

    let pouch: Vec2 | null = null
    let trajOrigin: Vec2 | null = null
    let trajVel: Vec2 | null = null

    if (this.state === "aiming" && this.input.pointer.down) {
      const { pull } = this.slingshot.getPull(
        this.input.pointer.x,
        this.input.pointer.y,
        (sx, sy) => this.camera.screenToWorld(sx, sy),
      )
      pouch = Renderer.pouchFromPull(this.slingshot, pull)
      this.ball.x = pouch.x
      this.ball.y = pouch.y
      trajOrigin = { x: this.slingshot.x, y: this.slingshot.y }
      trajVel = this.slingshot.launchVelocity(pull)
    }

    const pulse =
      !this.ball.inSlingshot && this.input.pointer.down
        ? 0.55 + Math.sin(this.anim * 6) * 0.25
        : this.ball.inSlingshot
          ? 0.35 + Math.sin(this.anim * 3) * 0.1
          : 0

    this.renderer.drawSlingshot(cam, this.slingshot, pouch, pulse)

    if (trajOrigin && trajVel) {
      this.renderer.drawTrajectory(cam, trajOrigin, trajVel)
    }

    this.renderer.drawBall(cam, this.ball)

    if (!this.started && this.state === "ready") {
      this.renderer.drawTitle(cam)
    }

    const tip = this.tipForState()
    this.renderer.drawHud(cam, this.score.current, tip)

    if (this.state === "gameOver") {
      this.renderer.drawGameOver(cam, this.score.current, this.score.highScore)
    }
  }

  private tipForState(): string | null {
    if (this.state === "gameOver") return null
    if (!this.started) return "Hold & drag to aim · release to fire"
    if (this.state === "flying") return "Hold to move · catch the ball"
    if (this.state === "catchPending") return "Drag a little to aim"
    if (this.state === "aiming") return "Release to launch"
    if (this.state === "ready") return "Drag to aim"
    return null
  }
}
