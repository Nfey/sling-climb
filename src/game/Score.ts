import {
  BONUS_PLATFORM_POINTS,
  CLIMB_POINT_UNIT,
  COIN_KEY,
  COIN_VALUE,
  HIGH_SCORE_KEY,
  MAX_HEIGHT_KEY,
} from "./constants"

export class Score {
  /** Peak world Y reached this run (world Y increases upward). */
  peakHeight = 0
  startHeight = 0
  /** Climb distance already converted to points (combo applied as gained). */
  heightPoints = 0
  bonusPoints = 0
  highScore = 0
  /** True after commitHighScore() if this run beat the previous best score. */
  isNewHighScore = false
  /** True after commitHighScore() if this run beat the previous best climb. */
  isNewBestHeight = false
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
  /**
   * Lifetime coin bank across runs. Survives resetRun / game over.
   * Saved immediately on collect when persistScores is enabled.
   */
  lifetimeCoins = 0
  /** When false, skip localStorage load/save (playable / bot). */
  private persistScores: boolean

  constructor(persistScores = true) {
    this.persistScores = persistScores
    if (this.persistScores) {
      this.highScore = this.loadNumber(HIGH_SCORE_KEY)
      this.bestMaxHeight = this.loadNumber(MAX_HEIGHT_KEY)
      this.lifetimeCoins = this.loadNumber(COIN_KEY)
    }
  }

  reset(startY: number): void {
    this.startHeight = startY
    this.peakHeight = startY
    this.heightPoints = 0
    this.bonusPoints = 0
    this.isNewHighScore = false
    this.isNewBestHeight = false
    this.combo = 1
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
   * 2×, 3×, … 10× multiples of the frozen best-height line.
   * Each entry carries worldY, a label, whether the player has passed it,
   * and a colorIndex (0-based, cycles every 10).
   */
  get milestoneLines(): { worldY: number; label: string; passed: boolean; colorIndex: number }[] {
    if (this.runHeightLine <= 0) return []
    const result = []
    for (let mult = 2; mult <= 10; mult++) {
      const climb = this.runHeightLine * mult
      result.push({
        worldY: this.startHeight + climb,
        label: `${mult}× BEST`,
        passed: this.climbHeight >= climb,
        colorIndex: mult - 2, // 0-based index into MILESTONE_COLORS
      })
    }
    return result
  }

  /**
   * Record a new peak height. Each new 10px climb unit is banked immediately
   * at the current combo so distance points scale with the multiplier.
   */
  observe(ballY: number): void {
    if (ballY <= this.peakHeight) return
    const prevPeak = this.peakHeight
    this.peakHeight = ballY
    const prevUnits = Math.max(
      0,
      Math.floor((prevPeak - this.startHeight) / CLIMB_POINT_UNIT),
    )
    const nextUnits = Math.max(
      0,
      Math.floor((this.peakHeight - this.startHeight) / CLIMB_POINT_UNIT),
    )
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

  /**
   * Bank collected coins into the lifetime total.
   * Persists immediately so totals survive mid-run reloads.
   * Returns the number of coins added.
   */
  addCoins(count: number): number {
    if (count <= 0) return 0
    const added = count * COIN_VALUE
    this.lifetimeCoins += added
    if (this.persistScores) this.saveNumber(COIN_KEY, this.lifetimeCoins)
    return added
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
   * Persist best run score and best climb height.
   * Returns true when this run set a new best score.
   */
  commitHighScore(): boolean {
    const runScore = this.current

    this.isNewHighScore = runScore > this.highScore
    if (this.isNewHighScore) {
      this.highScore = runScore
      if (this.persistScores) this.saveNumber(HIGH_SCORE_KEY, this.highScore)
    }

    this.isNewBestHeight = this.climbHeight > this.bestMaxHeight
    if (this.isNewBestHeight) {
      this.bestMaxHeight = this.climbHeight
      if (this.persistScores) this.saveNumber(MAX_HEIGHT_KEY, this.bestMaxHeight)
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
