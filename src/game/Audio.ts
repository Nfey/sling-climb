/**
 * Procedural Web Audio SFX for Slinger.
 * No external assets — oscillators + noise. Pitch / filter drama scales with
 * combo and uninterrupted climb; gain stays mostly flat.
 */

/** Soft ceiling so high combos don't squeal. */
const MAX_COMBO_FOR_PITCH = 12
/** Climb height (world px) that maxes flight drama. */
const CLIMB_FULL_SCALE = 1800

/** Default gameplay master gain (0..1). */
export const DEFAULT_MASTER_VOLUME = 0.55
/** Main-menu attract demo — audible bot backdrop, slightly louder than gameplay. */
export const MENU_DEMO_MASTER_VOLUME = 0.6

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export class GameAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private unlocked = false
  /** When true, skip all SFX and silence output. */
  private muted = false
  private masterVolume = DEFAULT_MASTER_VOLUME

  /** Hits since last catch — driven by Score.combo. */
  private combo = 1
  /** World-Y gained above the launch/catch baseline while airborne. */
  private climb = 0
  /** True while the player ball is in flight. */
  private flying = false

  private points: {
    osc: OscillatorNode
    gain: GainNode
    filter: BiquadFilterNode
    nextTick: number
  } | null = null

  /**
   * Unlock Web Audio on a real user gesture.
   * Must be called synchronously from pointer/key handlers — browsers reject
   * AudioContext.resume() when deferred to requestAnimationFrame.
   * Safe to call repeatedly until the context is running.
   */
  /** Silence all SFX and output. */
  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.resetFlight()
    this.applyMasterGain()
  }

  /** Set master output gain (0..1). Respects mute. */
  setMasterVolume(volume: number): void {
    this.masterVolume = clamp(volume, 0, 1)
    this.applyMasterGain()
  }

  private applyMasterGain(): void {
    if (this.master) {
      this.master.gain.value = this.muted ? 0 : this.masterVolume
    }
  }

  unlock(): void {
    // Always open AudioContext on a real gesture — mute only silences output.
    // Gating unlock on muted would miss the gesture stack before the menu exits.
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    if (ctx.state === "running") {
      this.unlocked = true
      return
    }
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        if (ctx.state === "running") this.unlocked = true
      })
    }
    // Tiny silent blip to fully open the audio pipeline on iOS Safari.
    // Re-run on each gesture until running — a deferred unlock leaves this muted.
    if (!this.unlocked) {
      const g = ctx.createGain()
      g.gain.value = 0.0001
      g.connect(this.master)
      const o = ctx.createOscillator()
      o.connect(g)
      o.start()
      o.stop(ctx.currentTime + 0.01)
    }
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.masterVolume
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  /** 0..1 combined drama from combo + climb. */
  private intensity(): number {
    const comboT = clamp((this.combo - 1) / (MAX_COMBO_FOR_PITCH - 1), 0, 1)
    const climbT = clamp(this.climb / CLIMB_FULL_SCALE, 0, 1)
    return clamp(comboT * 0.55 + climbT * 0.45, 0, 1)
  }

  /** Pitch multiplier in ~[1, 1.55] — higher with intensity, within reason. */
  private pitch(): number {
    return 1 + this.intensity() * 0.55
  }

  /** Slight gain bump only — never much louder. */
  private dramaGain(): number {
    return 1 + this.intensity() * 0.18
  }

  setCombo(combo: number): void {
    this.combo = Math.max(1, combo)
  }

  /** Update climb height gained since last catch (world px). */
  setClimb(climbPx: number): void {
    this.climb = Math.max(0, climbPx)
  }

  /** Begin flight loop (soft points arpeggio). */
  startFlight(): void {
    this.flying = true
    if (this.muted) return
    this.ensureCtx()
    this.startPointsLoop()
  }

  /** Catch / ground — stop flight loops and reset intensity. */
  resetFlight(): void {
    this.flying = false
    this.combo = 1
    this.climb = 0
    this.stopPointsLoop()
  }

  // ─── one-shots ───────────────────────────────────────────────────────────

  /** Rubber-band snap on launch. `power` is 0..1 slingshot stretch. */
  playLaunch(power = 0.7): void {
    if (this.muted) return
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const p = this.pitch()
    const gMul = this.dramaGain()
    const pow = clamp(power, 0.15, 1)

    // Twang
    const osc = ctx.createOscillator()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(180 * p * (0.7 + pow * 0.5), t)
    osc.frequency.exponentialRampToValueAtTime(70 * p, t + 0.12)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.28 * gMul * pow, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)

    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.2)

    // Short noise snap
    this.playNoiseBurst(0.05, 0.22 * gMul * pow, 900 * p, 1800 * p)
  }

  playPlatformBounce(): void {
    if (this.muted) return
    this.playBoing(220, 0.14, "sine")
  }

  playWallBounce(): void {
    if (this.muted) return
    this.playBoing(320, 0.08, "triangle")
  }

  playBumper(): void {
    if (this.muted) return
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const p = this.pitch()
    const gMul = this.dramaGain()

    const osc = ctx.createOscillator()
    osc.type = "square"
    osc.frequency.setValueAtTime(140 * p, t)
    osc.frequency.exponentialRampToValueAtTime(420 * p, t + 0.04)
    osc.frequency.exponentialRampToValueAtTime(90 * p, t + 0.16)

    const filt = ctx.createBiquadFilter()
    filt.type = "bandpass"
    filt.frequency.value = 600 * p
    filt.Q.value = 4 + this.intensity() * 4

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.2 * gMul, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)

    osc.connect(filt)
    filt.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.22)
  }

  playArrow(): void {
    if (this.muted) return
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const p = this.pitch()
    const gMul = this.dramaGain()

    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(240 * p, t)
    osc.frequency.exponentialRampToValueAtTime(720 * p, t + 0.1)

    const filt = ctx.createBiquadFilter()
    filt.type = "lowpass"
    filt.frequency.setValueAtTime(500 * p, t)
    filt.frequency.exponentialRampToValueAtTime(2400 * p, t + 0.08)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16 * gMul, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)

    osc.connect(filt)
    filt.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.18)

    this.playNoiseBurst(0.08, 0.12 * gMul, 400 * p, 2200 * p)
  }

  playPortal(): void {
    if (this.muted) return
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const p = this.pitch()
    const gMul = this.dramaGain()

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      osc.type = "sine"
      const f0 = (280 + i * 140) * p
      osc.frequency.setValueAtTime(f0, t + i * 0.03)
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.8, t + i * 0.03 + 0.12)

      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t + i * 0.03)
      g.gain.exponentialRampToValueAtTime(0.12 * gMul, t + i * 0.03 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + 0.18)

      osc.connect(g)
      g.connect(this.master)
      osc.start(t + i * 0.03)
      osc.stop(t + i * 0.03 + 0.2)
    }
  }

  playPowerup(): void {
    if (this.muted) return
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const master = this.master
    const t = ctx.currentTime
    const p = this.pitch()
    const gMul = this.dramaGain()
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.frequency.value = freq * p

      const g = ctx.createGain()
      const start = t + i * 0.055
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.14 * gMul, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)

      osc.connect(g)
      g.connect(master)
      osc.start(start)
      osc.stop(start + 0.25)
    })
  }

  /** Short bright chime when collecting a coin. */
  playCoin(): void {
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const p = this.pitch()
    const gMul = this.dramaGain()

    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(880 * p, t)
    osc.frequency.exponentialRampToValueAtTime(1320 * p, t + 0.08)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16 * gMul, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)

    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.16)
  }

  playCatch(): void {
    if (this.muted) return
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const t = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(420, t)
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.1)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)

    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.16)

    this.playNoiseBurst(0.04, 0.1, 200, 600)
  }

  playGameOver(): void {
    if (this.muted) return
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.45)

    const filt = ctx.createBiquadFilter()
    filt.type = "lowpass"
    filt.frequency.setValueAtTime(800, t)
    filt.frequency.exponentialRampToValueAtTime(120, t + 0.45)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)

    osc.connect(filt)
    filt.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.52)
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private playBoing(baseFreq: number, duration: number, type: OscillatorType): void {
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const p = this.pitch()
    const gMul = this.dramaGain()

    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(baseFreq * p, t)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * p * 0.45, t + duration)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.18 * gMul, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  private playNoiseBurst(
    duration: number,
    peakGain: number,
    filterStart: number,
    filterEnd: number,
  ): void {
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const buffer = this.noiseBuffer(duration + 0.05)
    const src = ctx.createBufferSource()
    src.buffer = buffer

    const filt = ctx.createBiquadFilter()
    filt.type = "bandpass"
    filt.Q.value = 1.2
    filt.frequency.setValueAtTime(filterStart, t)
    filt.frequency.exponentialRampToValueAtTime(Math.max(80, filterEnd), t + duration)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain), t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    src.connect(filt)
    filt.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + duration + 0.02)
  }

  private noiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  // ─── flight loops ────────────────────────────────────────────────────────

  /**
   * Soft arcade "points ticking" while airborne — short blips that speed up
   * and rise in pitch with intensity (not much louder).
   */
  private startPointsLoop(): void {
    if (this.points || !this.ctx || !this.master) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = 660

    const filter = ctx.createBiquadFilter()
    filter.type = "highpass"
    filter.frequency.value = 400

    const gain = ctx.createGain()
    gain.gain.value = 0.0001

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    osc.start()

    this.points = { osc, gain, filter, nextTick: ctx.currentTime + 0.2 }
  }

  private stopPointsLoop(): void {
    if (!this.points) return
    const { osc, gain } = this.points
    const ctx = this.ctx
    if (ctx) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      } catch {
        // ignore
      }
    }
    try {
      osc.stop()
    } catch {
      // already stopped
    }
    this.points = null
  }

  /** Call each frame while flying so the points arpeggio keeps ticking. */
  update(dt: number): void {
    if (!this.flying || !this.ctx || !this.points) return
    void dt
    const ctx = this.ctx
    const now = ctx.currentTime
    const i = this.intensity()
    const interval = 0.28 - i * 0.18 // faster ticks as drama rises
    const baseFreq = 520 * this.pitch()

    if (now >= this.points.nextTick) {
      const peak = 0.045 + i * 0.025
      this.points.osc.frequency.setValueAtTime(baseFreq, now)
      this.points.osc.frequency.exponentialRampToValueAtTime(
        baseFreq * 1.35,
        now + 0.04,
      )
      this.points.gain.gain.cancelScheduledValues(now)
      this.points.gain.gain.setValueAtTime(0.0001, now)
      this.points.gain.gain.exponentialRampToValueAtTime(peak, now + 0.01)
      this.points.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07)
      this.points.nextTick = now + interval
    }
  }
}
