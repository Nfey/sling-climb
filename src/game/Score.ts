import { HIGH_SCORE_KEY } from "./constants"

export class Score {
  /** Peak world Y reached this run (world Y increases upward). */
  peakHeight = 0
  startHeight = 0
  highScore = 0

  constructor() {
    this.highScore = this.loadHighScore()
  }

  reset(startY: number): void {
    this.startHeight = startY
    this.peakHeight = startY
  }

  observe(ballY: number): void {
    if (ballY > this.peakHeight) this.peakHeight = ballY
  }

  /** Integer meters-ish score from climb distance. */
  get current(): number {
    return Math.max(0, Math.floor((this.peakHeight - this.startHeight) / 10))
  }

  commitHighScore(): number {
    const score = this.current
    if (score > this.highScore) {
      this.highScore = score
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(score))
      } catch {
        // ignore quota / private mode
      }
    }
    return score
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
