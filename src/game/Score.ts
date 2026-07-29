import {
  BONUS_PLATFORM_POINTS,
  HIGH_SCORE_KEY,
  MAX_HEIGHT_KEY,
  SCORE_HEIGHT_EXP,
  SCORE_POINTS_EXP,
  SCORE_TIME_EXP,
} from "./constants"

export class Score {
  /** Peak world Y reached this run (world Y increases upward). */
  peakHeight = 0
  startHeight = 0
  /** Climb distance already converted to points (combo applied as gained). */
  heightPoints = 0
  bonusPoints = 0
  highScore = 0
  /** True after commitHighScore() if this run beat the previous best. */
  isNewHighScore = false
  /**
   * Point multiplier while the ball is airborne.
   * Starts at 1; bumps on platform / bumper / portal; resets on catch.
   */
  combo = 1
  /**
   * Best climb height (peak − start) from past runs.
   * Used as the source for the height indicator line.
   */
  bestMaxHeight = 0
  /**
   * Frozen at run start — the world climb height where the blue/green
   * max-height line is drawn. Does not rise during the current run.
   */
  runHeightLine = 0
  /** Composite end-of-run score after commitHighScore(). */
  finalScore = 0

  constructor() {
    this.highScore = this.loadNumber(HIGH_SCORE_KEY)
    this.bestMaxHeight = this.loadNumber(MAX_HEIGHT_KEY)
  }

  reset(startY: number): void {
    this.startHeight = startY
    this.peakHeight = startY
    this.heightPoints = 0
    this.bonusPoints = 0
    this.isNewHighScore = false
    this.combo = 1
    this.finalScore = 0
    // Snapshot previous best so the indicator stays fixed for this run.
    this.runHeightLine = this.bestMaxHeight
  }

  /** Climb above the run start (world px). */
  get climbHeight(): number {
    return Math.max(0, this.peakHeight - this.startHeight)
  }

  /** World Y of the frozen max-height indicator (0 when none yet). */
  get heightLineWorldY(): number {
    if (this.runHeightLine <= 0) return 0
    return this.startHeight + this.runHeightLine
  }

  /** True once this run's climb has reached or passed the frozen line. */
  get heightLinePassed(): boolean {
    return this.runHeightLine > 0 && this.climbHeight >= this.runHeightLine
  }

  /**
   * Record a new peak height. Each new 10px climb unit is banked immediately
   * at the current combo so distance points scale with the multiplier.
   */
  observe(ballY: number): void {
    if (ballY <= this.peakHeight) return
    const prevPeak = this.peakHeight
    this.peakHeight = ballY
    const prevUnits = Math.max(0, Math.floor((prevPeak - this.startHeight) / 10))
    const nextUnits = Math.max(0, Math.floor((this.peakHeight - this.startHeight) / 10))
    const gained = nextUnits - prevUnits
    if (gained > 0) this.heightPoints += gained * this.combo
  }

  /** Award base points multiplied by the current combo. Returns points added. */
  collectBonus(amount = BONUS_PLATFORM_POINTS): number {
    const awarded = amount * this.combo
    this.bonusPoints += awarded
    return awarded
  }

  /** Award points with no combo multiplier (e.g. purple secondary balls). */
  collectFlat(amount: number): number {
    this.bonusPoints += amount
    return amount
  }

  bumpCombo(): void {
    this.combo += 1
  }

  resetCombo(): void {
    this.combo = 1
  }

  /** Banked climb distance plus bonuses. */
  get current(): number {
    return this.heightPoints + this.bonusPoints
  }

  /**
   * End-of-run high score ≈ height × points / time.
   * Height is weighted a bit above points; total elapsed time only softens
   * the total — faster for the same height/points scores higher.
   */
  computeFinalScore(elapsed: number): number {
    const height = Math.max(1, this.climbHeight)
    const points = Math.max(1, this.current)
    const time = Math.max(1, elapsed)
    return Math.max(
      1,
      Math.round(
        (Math.pow(height, SCORE_HEIGHT_EXP) * Math.pow(points, SCORE_POINTS_EXP)) /
          Math.pow(time, SCORE_TIME_EXP),
      ),
    )
  }

  /**
   * Persist composite high score and best climb height.
   * Returns true when this run set a new best composite score.
   */
  commitHighScore(elapsed: number): boolean {
    this.finalScore = this.computeFinalScore(elapsed)

    if (this.climbHeight > this.bestMaxHeight) {
      this.bestMaxHeight = this.climbHeight
      this.saveNumber(MAX_HEIGHT_KEY, this.bestMaxHeight)
    }

    this.isNewHighScore = this.finalScore > this.highScore
    if (this.isNewHighScore) {
      this.highScore = this.finalScore
      this.saveNumber(HIGH_SCORE_KEY, this.highScore)
    }
    return this.isNewHighScore
  }

  private loadNumber(key: string): number {
    try {
      const raw = localStorage.getItem(key)
      const n = raw ? Number(raw) : 0
      return Number.isFinite(n) && n > 0 ? n : 0
    } catch {
      return 0
    }
  }

  private saveNumber(key: string, value: number): void {
    try {
      localStorage.setItem(key, String(value))
    } catch {
      // ignore quota / private mode
    }
  }
}
