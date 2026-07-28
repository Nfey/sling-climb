import { DUAL_SLING_DURATION } from "./constants"
import { Ball } from "./Ball"
import { Camera } from "./Camera"
import { Input } from "./Input"
import { PlatformManager } from "./Platform"
import { Renderer } from "./Renderer"
import { Score } from "./Score"
import { Slingshot } from "./Slingshot"
import type { GameState, PointerState, Vec2 } from "./types"

type SlingIndex = 0 | 1

export class Game {
  private camera = new Camera()
  private ball = new Ball()
  private slingshots: [Slingshot, Slingshot] = [new Slingshot(), new Slingshot()]
  /** Which slingshot currently holds the ball (-1 if flying). */
  private loadedSling: SlingIndex | -1 = 0
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

  /** Collected 2x upgrades waiting in the panel. */
  private dualInventory = 0
  /** Seconds remaining of dual-slingshot mode (0 = inactive). */
  private dualRemaining = 0
  /** pointerId → slingshot index while that finger controls it. */
  private pointerSling = new Map<number, SlingIndex>()

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

  private get primary(): Slingshot {
    return this.slingshots[0]
  }

  private get secondary(): Slingshot {
    return this.slingshots[1]
  }

  private dualActive(): boolean {
    return this.dualRemaining > 0
  }

  private activeSlings(): Slingshot[] {
    return this.dualActive() ? [...this.slingshots] : [this.primary]
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
      this.primary.x = width * 0.5
      this.primary.y = 0
      this.secondary.x = width * 0.35
      this.secondary.y = 0
      this.ball.reset(this.primary.x, this.primary.y)
    }
    this.camera.followSlingshot(this.primary.y)
  }

  private resetRun(): void {
    const width = this.camera.width
    this.primary.reset(width * 0.5, 0)
    this.secondary.reset(width * 0.35, 0)
    this.loadedSling = 0
    this.ball.reset(this.primary.x, this.primary.y)
    this.platforms.reset(width, this.primary.y)
    this.score.reset(this.primary.y)
    this.camera.followSlingshot(this.primary.y)
    this.state = "ready"
    this.started = false
    this.elapsed = 0
    this.dualInventory = 0
    this.dualRemaining = 0
    this.pointerSling.clear()
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

  private upgradeSlotRect(): { x: number; y: number; w: number; h: number } {
    const killY = this.camera.killScreenY
    const w = 72
    const h = 56
    return {
      x: this.camera.width / 2 - w / 2,
      y: killY + 36,
      w,
      h,
    }
  }

  private hitUpgradeSlot(x: number, y: number): boolean {
    const r = this.upgradeSlotRect()
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
  }

  private assignPointerToNearestSling(p: PointerState): void {
    const slings = this.activeSlings()
    let best: SlingIndex = 0
    let bestDist = Infinity
    for (let i = 0; i < slings.length; i++) {
      const idx = i as SlingIndex
      // Prefer unassigned slingshots
      const taken = [...this.pointerSling.values()].includes(idx)
      const screen = this.camera.worldToScreen({ x: slings[i]!.x, y: slings[i]!.y })
      const dist = Math.hypot(p.x - screen.x, p.y - screen.y) + (taken ? 1000 : 0)
      if (dist < bestDist) {
        bestDist = dist
        best = idx
      }
    }
    this.pointerSling.set(p.id, best)
  }

  private pointerForSling(idx: SlingIndex): PointerState | null {
    for (const [id, slingIdx] of this.pointerSling) {
      if (slingIdx === idx) {
        return this.input.getPointer(id) ?? null
      }
    }
    return null
  }

  private update(dt: number): void {
    if (this.dualRemaining > 0) {
      this.dualRemaining = Math.max(0, this.dualRemaining - dt)
      if (this.dualRemaining === 0) {
        // Drop secondary assignments when dual expires
        for (const [id, idx] of [...this.pointerSling]) {
          if (idx === 1) this.pointerSling.delete(id)
        }
        if (this.loadedSling === 1 && this.ball.inSlingshot) {
          // Transfer ball to primary if dual ends while loaded in secondary
          this.loadedSling = 0
          this.ball.x = this.primary.x
          this.ball.y = this.primary.y
        }
      }
    }

    // Keep secondary on the same world Y as primary (shared horizontal line)
    this.secondary.y = this.primary.y

    const presses = this.input.consumePresses()
    const releases = this.input.consumeReleases()

    for (const id of releases) {
      this.pointerSling.delete(id)
    }

    if (this.state === "gameOver") {
      for (const p of presses) {
        if (p.y < this.camera.killScreenY) {
          this.resetRun()
          break
        }
      }
      return
    }

    // Handle new presses: upgrade panel first, then slingshot control
    for (const p of presses) {
      if (this.hitUpgradeSlot(p.x, p.y)) {
        if (this.dualInventory > 0 && this.dualRemaining <= 0) {
          this.dualInventory -= 1
          this.dualRemaining = DUAL_SLING_DURATION
          // Place secondary near primary if just activated
          this.secondary.x = Math.max(
            40,
            Math.min(this.camera.width - 40, this.primary.x - 80),
          )
          this.secondary.y = this.primary.y
        }
        continue
      }
      // Ignore presses deep in the reserved panel for gameplay
      if (p.y >= this.camera.killScreenY) continue
      this.assignPointerToNearestSling(p)
    }

    // --- Ball in a slingshot: aim / fire ---
    if (this.ball.inSlingshot) {
      const holderIdx: SlingIndex = this.loadedSling === 1 && this.dualActive() ? 1 : 0
      this.loadedSling = holderIdx
      const holder = this.slingshots[holderIdx]
      holder.frozen = true
      this.ball.x = holder.x
      this.ball.y = holder.y

      // Other slingshot can still be dragged while aiming
      for (const sling of this.activeSlings()) {
        if (sling === holder) continue
        sling.frozen = false
        const ctrl = this.pointerForSling(sling === this.primary ? 0 : 1)
        if (ctrl) sling.setX(ctrl.x, this.camera.width)
      }

      const aimPtr = this.pointerForSling(holderIdx)

      if (this.state === "ready") {
        if (aimPtr) {
          this.state = "aiming"
          this.started = true
        } else {
          // Any play-area pointer on the loaded sling starts aiming
          for (const p of this.input.activePointers()) {
            if (p.y >= this.camera.killScreenY) continue
            if (!this.pointerSling.has(p.id)) this.assignPointerToNearestSling(p)
            if (this.pointerSling.get(p.id) === holderIdx) {
              this.state = "aiming"
              this.started = true
              break
            }
          }
        }
      }

      if (this.state === "aiming") {
        const ptr = this.pointerForSling(holderIdx)
        if (!ptr) {
          // Released the aiming finger — fire or cancel
          // Use last known position from release: if no pointer, treat as release at rest
          // We need release position — check if we just released this sling's pointer
          // Fall back: cancel weak shot by checking stretch
          if (holder.stretch > 0.08) {
            // Reconstruct from stretch is hard; fire upward-ish from last stretch stored pull
            // Instead store last pull on the slingshot during aim
            const last = this.lastAimPull
            if (last && Math.hypot(last.x, last.y) > 8) {
              const vel = holder.launchVelocity(last)
              this.ball.x = holder.x
              this.ball.y = holder.y
              this.ball.launch(vel)
              this.state = "flying"
              this.loadedSling = -1
              holder.frozen = false
              holder.stretch = 0
              this.lastAimPull = null
            } else {
              this.state = "ready"
              holder.stretch = 0
              this.lastAimPull = null
            }
          } else {
            this.state = "ready"
            holder.stretch = 0
            this.lastAimPull = null
          }
        } else {
          const { pull, power } = holder.getPull(
            ptr.x,
            ptr.y,
            (sx, sy) => this.camera.screenToWorld(sx, sy),
          )
          holder.stretch = power
          this.lastAimPull = pull
        }
      }
    } else {
      // Flying: each finger moves its assigned slingshot
      this.state = "flying"
      this.loadedSling = -1
      for (const sling of this.activeSlings()) {
        sling.frozen = false
      }

      for (const [id, idx] of this.pointerSling) {
        if (!this.dualActive() && idx === 1) continue
        const ptr = this.input.getPointer(id)
        if (ptr) this.slingshots[idx].setX(ptr.x, this.camera.width)
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
      if (hit.upgradeCollected) this.dualInventory += 1
      this.score.observe(this.ball.y)

      this.advanceWorld()
      this.secondary.y = this.primary.y

      // Catch with a held slingshot
      if (this.ball.vy <= 0) {
        for (let i = 0; i < this.activeSlings().length; i++) {
          const idx = i as SlingIndex
          const sling = this.slingshots[idx]
          const ctrl = this.pointerForSling(idx)
          if (ctrl && sling.canCatch(this.ball.x, this.ball.y)) {
            this.ball.catchAt(sling.x, sling.y)
            sling.frozen = true
            this.loadedSling = idx
            this.state = "aiming"
            this.started = true
            this.lastAimPull = null
            break
          }
        }
      }

      if (
        !this.ball.inSlingshot &&
        this.ball.vy <= 0 &&
        this.ball.y < this.camera.killWorldY
      ) {
        this.score.commitHighScore()
        this.state = "gameOver"
        this.dualRemaining = 0
      }
    }

    this.platforms.update(this.camera.y, this.camera.height, this.camera.killWorldY)
    this.camera.followSlingshot(this.primary.y)
  }

  /** Last aim pull while dragging, used to fire on release. */
  private lastAimPull: Vec2 | null = null

  private advanceWorld(): void {
    const maxAbove = this.camera.height * 0.32
    if (this.ball.y > this.primary.y + maxAbove) {
      this.primary.y = this.ball.y - maxAbove
      this.secondary.y = this.primary.y
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

    const holderIdx: SlingIndex | -1 = this.ball.inSlingshot
      ? this.loadedSling === 1 && this.dualActive()
        ? 1
        : 0
      : -1

    // Draw secondary first (under), then primary
    if (this.dualActive()) {
      let pouch2: Vec2 | null = null
      if (holderIdx === 1 && this.state === "aiming") {
        const ptr = this.pointerForSling(1)
        if (ptr) {
          const { pull } = this.secondary.getPull(
            ptr.x,
            ptr.y,
            (sx, sy) => this.camera.screenToWorld(sx, sy),
          )
          pouch2 = Renderer.pouchFromPull(this.secondary, pull)
          this.ball.x = pouch2.x
          this.ball.y = pouch2.y
        }
      }
      const pulse2 =
        !this.ball.inSlingshot && this.pointerForSling(1)
          ? 0.55 + Math.sin(this.anim * 6) * 0.25
          : this.loadedSling === 1
            ? 0.35 + Math.sin(this.anim * 3) * 0.1
            : 0.2
      this.renderer.drawSlingshot(cam, this.secondary, pouch2, pulse2, true)
      if (holderIdx === 1 && pouch2 && this.lastAimPull) {
        this.renderer.drawTrajectory(
          cam,
          { x: this.secondary.x, y: this.secondary.y },
          this.secondary.launchVelocity(this.lastAimPull),
        )
      }
    }

    let pouch: Vec2 | null = null
    let trajOrigin: Vec2 | null = null
    let trajVel: Vec2 | null = null
    if (holderIdx === 0 && this.state === "aiming") {
      const ptr = this.pointerForSling(0)
      if (ptr) {
        const { pull } = this.primary.getPull(
          ptr.x,
          ptr.y,
          (sx, sy) => this.camera.screenToWorld(sx, sy),
        )
        pouch = Renderer.pouchFromPull(this.primary, pull)
        this.ball.x = pouch.x
        this.ball.y = pouch.y
        trajOrigin = { x: this.primary.x, y: this.primary.y }
        trajVel = this.primary.launchVelocity(pull)
      } else if (this.lastAimPull) {
        trajOrigin = { x: this.primary.x, y: this.primary.y }
        trajVel = this.primary.launchVelocity(this.lastAimPull)
      }
    }

    const pulse =
      !this.ball.inSlingshot && this.pointerForSling(0)
        ? 0.55 + Math.sin(this.anim * 6) * 0.25
        : this.ball.inSlingshot && holderIdx === 0
          ? 0.35 + Math.sin(this.anim * 3) * 0.1
          : 0

    this.renderer.drawSlingshot(cam, this.primary, pouch, pulse, false)

    if (trajOrigin && trajVel) {
      this.renderer.drawTrajectory(cam, trajOrigin, trajVel)
    }

    this.renderer.drawBall(cam, this.ball)

    if (!this.started && this.state === "ready") {
      this.renderer.drawTitle(cam)
    }

    const tip = this.tipForState()
    this.renderer.drawHud(cam, this.score.current, this.elapsed, tip)
    this.renderer.drawUpgradePanel(
      cam,
      this.upgradeSlotRect(),
      this.dualInventory,
      this.dualRemaining,
    )

    if (this.state === "gameOver") {
      this.renderer.drawGameOver(cam, this.score.current, this.score.highScore)
    }
  }

  private tipForState(): string | null {
    if (this.state === "gameOver") return null
    if (!this.started) return "Hold & drag to aim · release to fire"
    if (this.state === "flying") {
      return this.dualActive()
        ? "Two fingers · catch with either slingshot"
        : "Hold to move · catch the ball"
    }
    if (this.state === "aiming") return "Release to launch"
    if (this.state === "ready") return "Drag to aim"
    return null
  }
}
