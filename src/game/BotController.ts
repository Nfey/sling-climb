import { MAX_PULL } from "./constants"
import type { BotStyle } from "./config"
import type { BotAimTarget, GameSnapshot, Vec2 } from "./types"

/** Minimal surface the autopilot needs from Game. */
export interface BotGameApi {
  snapshot(): GameSnapshot
  setSlingX(x: number): void
  beginAimPull(pull: Vec2): void
  setAimPull(pull: Vec2): void
  releaseAim(): void
  restartRun(): void
  readonly autoRestart: boolean
}

function isHumanLike(style: BotStyle): boolean {
  return style === "human" || style === "human-seek"
}

function isPerfectTrack(style: BotStyle): boolean {
  return style === "perfect" || style === "perfect-seek"
}

function isSeekStyle(style: BotStyle): boolean {
  return style === "perfect-seek" || style === "human-seek"
}

/**
 * Keeps the slingshot under the ball and fires aims.
 * `perfect` / `human` — original random aims (unchanged).
 * `perfect-seek` / `human-seek` — full pulls, diagonal bias, aim at hazards.
 */
export class BotController {
  private style: BotStyle
  private phase: "idle" | "aiming" | "cooldown" = "idle"
  private phaseT = 0
  private aimHold = 0.18
  private pendingPull: Vec2 = { x: 0, y: 40 }
  /** Delayed ball X sample for human-like tracking. */
  private delayedX = 0
  private delayBuf: { t: number; x: number }[] = []
  private clock = 0
  private humanLag = 0.12
  private trackBias = 0

  constructor(style: BotStyle = "perfect") {
    this.style = style
    this.humanLag = 0.08 + Math.random() * 0.1
  }

  reset(): void {
    this.phase = "idle"
    this.phaseT = 0
    this.delayBuf = []
    this.clock = 0
    this.trackBias = (Math.random() - 0.5) * 18
    this.humanLag = 0.08 + Math.random() * 0.1
  }

  update(dt: number, game: BotGameApi): void {
    this.clock += dt
    const snap = game.snapshot()

    if (snap.state === "adEnd") return

    if (snap.state === "menu") {
      // Bot/playable should not land here; if they do, wait for host to leave menu.
      return
    }

    if (snap.state === "gameOver") {
      if (game.autoRestart) {
        this.phaseT += dt
        if (this.phaseT > 0.55) {
          this.reset()
          game.restartRun()
        }
      }
      return
    }

    if (snap.state === "flying" || (!snap.ball.inSlingshot && snap.state !== "aiming")) {
      this.trackBall(dt, game, snap)
      this.phase = "idle"
      this.phaseT = 0
      return
    }

    // Ball loaded: ready or aiming
    if (snap.state === "ready" || snap.state === "aiming") {
      this.runAimCycle(dt, game, snap)
    }
  }

  private trackBall(dt: number, game: BotGameApi, snap: GameSnapshot): void {
    const targetX = isPerfectTrack(this.style)
      ? snap.ball.x
      : this.sampleDelayedX(snap.ball.x) + this.trackBias

    if (isPerfectTrack(this.style)) {
      game.setSlingX(targetX)
      return
    }

    // Smooth chase toward lagged target
    const cur = snap.slingshot.x
    const blend = 1 - Math.exp(-12 * dt)
    game.setSlingX(cur + (targetX - cur) * blend)
  }

  private sampleDelayedX(ballX: number): number {
    this.delayBuf.push({ t: this.clock, x: ballX })
    const cutoff = this.clock - this.humanLag
    while (this.delayBuf.length > 1 && this.delayBuf[1]!.t <= cutoff) {
      this.delayBuf.shift()
    }
    const oldest = this.delayBuf[0]
    this.delayedX = oldest ? oldest.x : ballX
    // Drop entries older than lag window (keep one)
    while (this.delayBuf.length > 2 && this.delayBuf[0]!.t < cutoff - 0.05) {
      this.delayBuf.shift()
    }
    return this.delayedX
  }

  private runAimCycle(dt: number, game: BotGameApi, snap: GameSnapshot): void {
    if (this.phase === "idle" || this.phase === "cooldown") {
      this.phaseT += dt
      const wait =
        this.phase === "cooldown" ? 0.12 : isHumanLike(this.style) ? 0.22 : 0.1
      if (this.phaseT < wait) return

      this.pendingPull = isSeekStyle(this.style)
        ? this.seekPull(snap)
        : this.randomPull()
      this.aimHold = isHumanLike(this.style)
        ? 0.22 + Math.random() * 0.2
        : 0.12 + Math.random() * 0.1
      this.phase = "aiming"
      this.phaseT = 0
      game.beginAimPull(this.pendingPull)
      return
    }

    // aiming
    this.phaseT += dt
    if (isHumanLike(this.style)) {
      // Slight wobble while holding
      const wobble = {
        x: this.pendingPull.x + Math.sin(this.clock * 9) * 4,
        y: this.pendingPull.y + Math.cos(this.clock * 7) * 3,
      }
      game.setAimPull(this.clampPull(wobble))
    } else {
      game.setAimPull(this.pendingPull)
    }

    if (this.phaseT >= this.aimHold) {
      game.releaseAim()
      this.phase = "cooldown"
      this.phaseT = 0
    }
  }

  /** Original random aim — keep behavior identical for perfect / human. */
  private randomPull(): Vec2 {
    const angle =
      this.style === "perfect"
        ? -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.95
        : -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.75
    const power =
      this.style === "perfect"
        ? 0.45 + Math.random() * 0.55
        : 0.4 + Math.random() * 0.5
    const len = MAX_PULL * power
    // Pull is opposite launch — downward-ish pulls send the ball up.
    return this.clampPull({
      x: Math.cos(angle) * len,
      y: Math.sin(angle) * len,
    })
  }

  /**
   * Seek variant: mostly full pulls, avoid straight-up / flat sides,
   * and often aim toward portals / bumpers / arrows / bonus platforms.
   */
  private seekPull(snap: GameSnapshot): Vec2 {
    const power =
      Math.random() < 0.82
        ? 0.9 + Math.random() * 0.1
        : 0.72 + Math.random() * 0.18

    let launchAngle: number | null = null
    const target = this.pickSeekTarget(snap.targets)
    if (target) {
      const dx = target.x - snap.slingshot.x
      // Bias slightly above the target so arcs still climb into it.
      const dy = Math.max(36, target.y - snap.slingshot.y)
      if (Math.hypot(dx, dy) > 20) {
        launchAngle = Math.atan2(dy, dx)
      }
    }

    if (launchAngle == null) {
      // Two diagonal lobes off vertical — avoid straight up and flat sides.
      const side = Math.random() < 0.5 ? -1 : 1
      const fromVertical = 0.38 + Math.random() * 0.48 // ~22°–49°
      launchAngle = Math.PI * 0.5 + side * fromVertical
    } else {
      // Nudge pure vertical / near-horizontal target aims toward a usable arc.
      const fromUp = launchAngle - Math.PI * 0.5
      if (Math.abs(fromUp) < 0.18) {
        launchAngle += (Math.random() < 0.5 ? -1 : 1) * (0.28 + Math.random() * 0.2)
      } else if (Math.abs(fromUp) > 1.15) {
        launchAngle = Math.PI * 0.5 + Math.sign(fromUp || 1) * (0.55 + Math.random() * 0.25)
      }
    }

    // Pull is opposite the launch direction.
    const angle = launchAngle + Math.PI
    const len = MAX_PULL * power
    let pull = this.clampPull({
      x: Math.cos(angle) * len,
      y: Math.sin(angle) * len,
    })

    // Human-seek: light aim noise (perfect-seek stays locked).
    if (this.style === "human-seek") {
      pull = this.clampPull({
        x: pull.x + (Math.random() - 0.5) * 16,
        y: pull.y + (Math.random() - 0.5) * 10,
      })
    }

    return pull
  }

  private pickSeekTarget(targets: BotAimTarget[]): BotAimTarget | null {
    if (targets.length === 0) return null
    // Usually chase something interesting when it exists.
    if (Math.random() > 0.78) return null

    let total = 0
    for (const t of targets) total += t.weight
    let r = Math.random() * total
    for (const t of targets) {
      r -= t.weight
      if (r <= 0) return t
    }
    return targets[targets.length - 1] ?? null
  }

  private clampPull(pull: Vec2): Vec2 {
    const len = Math.hypot(pull.x, pull.y)
    if (len <= MAX_PULL || len < 1e-6) return pull
    return {
      x: (pull.x / len) * MAX_PULL,
      y: (pull.y / len) * MAX_PULL,
    }
  }
}
