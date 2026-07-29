/**
 * Procedural Web Audio SFX for Sling Climb.
 * No external assets — oscillators + noise. Pitch / filter drama scales with
 * combo and uninterrupted climb; gain stays mostly flat.
 */

/** Soft ceiling so high combos don't squeal. */
const MAX_COMBO_FOR_PITCH = 12
/** Climb height (world px) that maxes the whoosh drama. */
const CLIMB_FULL_SCALE = 1800

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export class GameAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private unlocked = false

  /** Hits since last catch (mirrors combo meter). */
  private combo = 1
  /** World-Y gained above the launch/catch baseline while airborne. */
  private climb = 0
  /** True while the player ball is in flight. */
  private flying = false

  private whoosh: {
    noise: AudioBufferSourceNode
    filter: BiquadFilterNode
    gain: GainNode
    lfo: OscillatorNode
    lfoGain: GainNode
  } | null = null

  private points: {
    osc: OscillatorNode
    gain: GainNode
    filter: BiquadFilterNode
    nextTick: number
  } | null = null

  private stretch: {
    osc: OscillatorNode
    gain: GainNode
  } | null = null

  /** Unlock on first gesture (browsers block autoplay). */
  unlock(): void {
    if (this.unlocked) return
    const ctx = this.ensureCtx()
    if (!ctx) return
    if (ctx.state === "suspended") {
      void ctx.resume()
    }
    // Tiny silent blip to fully open the audio pipeline on iOS Safari.
    const g = ctx.createGain()
    g.gain.value = 0.0001
    g.connect(this.master!)
    const o = ctx.createOscillator()
    o.connect(g)
    o.start()
    o.stop(ctx.currentTime + 0.01)
    this.unlocked = true
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
      this.master.gain.value = 0.55
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
    this.refreshLoops()
  }

  bumpCombo(): void {
    this.combo += 1
    this.refreshLoops()
  }

  /** Update climb height gained since last catch (world px). */
  setClimb(climbPx: number): void {
    this.climb = Math.max(0, climbPx)
    this.refreshLoops()
  }

  /** Begin flight loops (whoosh + soft points arpeggio). */
  startFlight(): void {
    this.flying = true
    this.ensureCtx()
    this.startWhoosh()
    this.startPointsLoop()
    this.refreshLoops()
  }

  /** Catch / ground — stop flight loops and reset intensity. */
  resetFlight(): void {
    this.flying = false
    this.combo = 1
    this.climb = 0
    this.stopWhoosh()
    this.stopPointsLoop()
    this.stopStretch()
  }

  /**
   * Soft rubber-band tension while aiming. `power` is 0..1 stretch;
   * pass 0 (or call stop) when not aiming.
   */
  setAimStretch(power: number): void {
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return
    const p = clamp(power, 0, 1)
    if (p < 0.04) {
      this.stopStretch()
      return
    }
    if (!this.stretch) {
      const osc = ctx.createOscillator()
      osc.type = "sawtooth"
      osc.frequency.value = 60
      const gain = ctx.createGain()
      gain.gain.value = 0.0001
      const filt = ctx.createBiquadFilter()
      filt.type = "lowpass"
      filt.frequency.value = 280
      osc.connect(filt)
      filt.connect(gain)
      gain.connect(this.master)
      osc.start()
      this.stretch = { osc, gain }
    }
    const t = ctx.currentTime
    // Pitch rises gently with pull; stay quiet under launch snap.
    this.stretch.osc.frequency.setTargetAtTime(55 + p * 90, t, 0.05)
    this.stretch.gain.gain.setTargetAtTime(0.02 + p * 0.04, t, 0.05)
  }

  private stopStretch(): void {
    if (!this.stretch) return
    const { osc, gain } = this.stretch
    const ctx = this.ctx
    if (ctx) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03)
      } catch {
        // ignore
      }
    }
    try {
      osc.stop(ctx ? ctx.currentTime + 0.06 : undefined)
    } catch {
      // already stopped
    }
    this.stretch = null
  }

  // ─── one-shots ───────────────────────────────────────────────────────────

  /** Rubber-band snap on launch. `power` is 0..1 slingshot stretch. */
  playLaunch(power = 0.7): void {
    this.stopStretch()
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
    this.playBoing(220, 0.14, "sine")
  }

  playWallBounce(): void {
    this.playBoing(320, 0.08, "triangle")
  }

  playBumper(): void {
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

  playCatch(): void {
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

  private startWhoosh(): void {
    if (this.whoosh || !this.ctx || !this.master) return
    const ctx = this.ctx
    const buffer = this.noiseBuffer(1.5)
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = 420
    filter.Q.value = 0.7

    const gain = ctx.createGain()
    gain.gain.value = 0.0001

    // Subtle amplitude flutter
    const lfo = ctx.createOscillator()
    lfo.type = "sine"
    lfo.frequency.value = 3.5
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.012
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    noise.start()
    lfo.start()

    this.whoosh = { noise, filter, gain, lfo, lfoGain }
  }

  private stopWhoosh(): void {
    if (!this.whoosh) return
    const { noise, lfo, gain } = this.whoosh
    const ctx = this.ctx
    if (ctx) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04)
      } catch {
        // ignore
      }
    }
    try {
      noise.stop(ctx ? ctx.currentTime + 0.08 : undefined)
    } catch {
      // already stopped
    }
    try {
      lfo.stop()
    } catch {
      // already stopped
    }
    this.whoosh = null
  }

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

  private refreshLoops(): void {
    if (!this.ctx) return
    const i = this.intensity()
    const t = this.ctx.currentTime

    if (this.whoosh) {
      // Filter opens + slight volume rise with drama (still quiet under SFX)
      const freq = 380 + i * 900
      const vol = 0.028 + i * 0.045
      this.whoosh.filter.frequency.setTargetAtTime(freq, t, 0.08)
      this.whoosh.filter.Q.setTargetAtTime(0.65 + i * 0.9, t, 0.08)
      this.whoosh.gain.gain.setTargetAtTime(vol, t, 0.1)
      this.whoosh.lfo.frequency.setTargetAtTime(3.2 + i * 4, t, 0.1)
      this.whoosh.lfoGain.gain.setTargetAtTime(0.01 + i * 0.02, t, 0.1)
    }
  }
}
