import { BONUS_PLATFORM_POINTS, HIGH_SCORE_KEY } from "./constants"

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

  constructor() {
    this.highScore = this.loadHighScore()
  }

  reset(startY: number): void {
    this.startHeight = startY
    this.peakHeight = startY
    this.heightPoints = 0
    this.bonusPoints = 0
    this.isNewHighScore = false
    this.combo = 1
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

  /** Persist high score if beaten. Returns true when this run set a new best. */
  commitHighScore(): boolean {
    const score = this.current
    this.isNewHighScore = score > this.highScore
    if (this.isNewHighScore) {
      this.highScore = score
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(score))
      } catch {
        // ignore quota / private mode
      }
    }
    return this.isNewHighScore
  }

  private loadHighScore(): number {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY)
      const n = raw ? Number(raw) : 0
      return Number.isFinite(n) ? n : 0
    } catch {
      return 0
    }
  }
}
