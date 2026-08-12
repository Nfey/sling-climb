/**
 * Lifetime achievements: unlock permanently and persist across runs.
 * Progress is tracked from the same in-run events as daily missions.
 */

import type { AchievementIconKind } from "./achievementIcons"

export const ACHIEVEMENTS_KEY = "sling-climb-achievements"

export type AchievementCategory =
  | "speed"
  | "height"
  | "score"
  | "obstacles"
  | "coins"
  | "fails"

export interface AchievementDef {
  id: string
  category: AchievementCategory
  name: string
  /** Shown while locked — how to unlock. */
  howTo: string
  icon: AchievementIconKind
}

export interface AchievementView {
  def: AchievementDef
  unlocked: boolean
}

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  speed: "Speed",
  height: "Height",
  score: "Score",
  obstacles: "Hits",
  coins: "Coins",
  fails: "Fails",
}

export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategory[] = [
  "speed",
  "height",
  "score",
  "obstacles",
  "coins",
  "fails",
]

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // Speed — catch while the ball is still moving this fast
  // Max normal launch ≈ 1,208; max POW launch ≈ 2,415.
  {
    id: "speed-catch-900",
    category: "speed",
    name: "Speedy Recovery",
    howTo: "Catch the ball while it's going 900+ speed",
    icon: "speed1",
  },
  {
    id: "speed-catch-1200",
    category: "speed",
    name: "Need for Speed",
    howTo: "Catch the ball while it's going 1,200+ speed (near a full-power launch)",
    icon: "speed2",
  },
  {
    id: "speed-catch-1800",
    category: "speed",
    name: "Sonic Boom",
    howTo: "Catch the ball while it's going 1,800+ speed",
    icon: "speed3",
  },
  {
    id: "speed-catch-2300",
    category: "speed",
    name: "Warp Catch",
    howTo:
      "Catch the ball while it's going 2,300+ speed — near the fastest a POW launch can send it",
    icon: "speed4",
  },

  // Height — climb gained in a single fling (not the whole run)
  {
    id: "height-fling-400",
    category: "height",
    name: "First Steps",
    howTo: "Climb 400 height in one fling",
    icon: "height1",
  },
  {
    id: "height-fling-1000",
    category: "height",
    name: "Getting Air",
    howTo: "Climb 1,000 height in one fling",
    icon: "height2",
  },
  {
    id: "height-fling-2500",
    category: "height",
    name: "Skybound",
    howTo: "Climb 2,500 height in one fling",
    icon: "height3",
  },
  {
    id: "height-fling-5000",
    category: "height",
    name: "Stratosphere",
    howTo: "Climb 5,000 height in one fling",
    icon: "height4",
  },

  // Score — points gained in a single fling (not the whole run)
  {
    id: "score-fling-300",
    category: "score",
    name: "Point Scout",
    howTo: "Score 300 points in one fling",
    icon: "score1",
  },
  {
    id: "score-fling-800",
    category: "score",
    name: "Score Chaser",
    howTo: "Score 800 points in one fling",
    icon: "score2",
  },
  {
    id: "score-fling-2000",
    category: "score",
    name: "High Roller",
    howTo: "Score 2,000 points in one fling",
    icon: "score3",
  },
  {
    id: "score-fling-5000",
    category: "score",
    name: "Point Legend",
    howTo: "Score 5,000 points in one fling",
    icon: "score4",
  },

  // Obstacles — hits in a single fling
  {
    id: "obstacles-3",
    category: "obstacles",
    name: "Tap Tap",
    howTo: "Hit 3 obstacles in one fling",
    icon: "hits1",
  },
  {
    id: "obstacles-6",
    category: "obstacles",
    name: "Obstacle Course",
    howTo: "Hit 6 obstacles in one fling",
    icon: "hits2",
  },
  {
    id: "obstacles-10",
    category: "obstacles",
    name: "Chaos Cascade",
    howTo: "Hit 10 obstacles in one fling",
    icon: "hits3",
  },
  {
    id: "obstacles-15",
    category: "obstacles",
    name: "Demolition Derby",
    howTo: "Hit 15 obstacles in one fling",
    icon: "hits4",
  },

  // Coins — lifetime bank
  {
    id: "coins-10",
    category: "coins",
    name: "Pocket Change",
    howTo: "Collect 10 coins total",
    icon: "coins1",
  },
  {
    id: "coins-50",
    category: "coins",
    name: "Coin Purse",
    howTo: "Collect 50 coins total",
    icon: "coins2",
  },
  {
    id: "coins-150",
    category: "coins",
    name: "Treasure Trove",
    howTo: "Collect 150 coins total",
    icon: "coins3",
  },
  {
    id: "coins-400",
    category: "coins",
    name: "Dragon's Hoard",
    howTo: "Collect 400 coins total",
    icon: "coins4",
  },

  // Funny fails
  {
    id: "fail-bamboozled",
    category: "fails",
    name: "Bamboozled",
    howTo: "Lose after flinging the ball directly into an arrow",
    icon: "failBamboozled",
  },
  {
    id: "fail-southbound",
    category: "fails",
    name: "Southbound Express",
    howTo: "Hit a downward arrow, then fall to your doom",
    icon: "failSouth",
  },
  {
    id: "fail-whiff",
    category: "fails",
    name: "Total Whiff",
    howTo: "Lose a fling without hitting anything",
    icon: "failWhiff",
  },
  {
    id: "fail-so-close",
    category: "fails",
    name: "So Close",
    howTo: "Die just beside the slingshot (almost caught it)",
    icon: "failClose",
  },
  {
    id: "fail-icarus",
    category: "fails",
    name: "Icarus",
    howTo: "Climb 1,000+ in one fling, then miss the catch",
    icon: "failIcarus",
  },
  {
    id: "fail-turret",
    category: "fails",
    name: "Cannon Fodder",
    howTo: "Get clipped by a turret shot, then lose the fling",
    icon: "failTurret",
  },
  {
    id: "fail-cold-open",
    category: "fails",
    name: "Cold Open",
    howTo: "Die on your first fling before scoring 100 points",
    icon: "failCold",
  },
]

const DEF_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

interface AchievementsPersist {
  unlocked: string[]
  coinsCollected?: number
}

export interface AchievementGameOverContext {
  ballX: number
  ballY: number
  slingX: number
  slingY: number
  catchRadius: number
  runScore: number
}

export class AchievementsStore {
  private persist: boolean
  private unlocked = new Set<string>()

  /** Platforms + bumpers + portals + arrows this fling. */
  private flingObstacles = 0
  private flingHadHit = false
  private flingFirstHitWasArrow = false
  private flingHitDownArrow = false
  private flingHitTurret = false
  private flingPeakClimb = 0
  private flingStartY = 0
  /** Run score at the start of the current fling. */
  private flingStartScore = 0
  private runFlings = 0

  /** Lifetime coins collected (not the spendable bank). */
  private coinsCollected = 0
  /** Newly unlocked ids waiting to be shown as toasts. */
  private pendingUnlocks: string[] = []

  constructor(persist = true) {
    this.persist = persist
    if (this.persist) this.load()
  }

  /** Drain recently unlocked achievements for mid-match toasts. */
  drainUnlocks(): AchievementDef[] {
    if (this.pendingUnlocks.length === 0) return []
    const ids = this.pendingUnlocks
    this.pendingUnlocks = []
    const out: AchievementDef[] = []
    for (const id of ids) {
      const def = DEF_BY_ID.get(id)
      if (def) out.push(def)
    }
    return out
  }

  get unlockedCount(): number {
    return this.unlocked.size
  }

  get totalCount(): number {
    return ACHIEVEMENTS.length
  }

  isUnlocked(id: string): boolean {
    return this.unlocked.has(id)
  }

  /** All achievements, optionally filtered by category. */
  list(category?: AchievementCategory): AchievementView[] {
    const defs = category
      ? ACHIEVEMENTS.filter((a) => a.category === category)
      : ACHIEVEMENTS
    return defs.map((def) => ({
      def,
      unlocked: this.unlocked.has(def.id),
    }))
  }

  onRunStart(): void {
    this.runFlings = 0
    this.resetFling()
  }

  onFlingStart(startY: number, startScore: number): void {
    this.runFlings += 1
    this.resetFling()
    this.flingStartY = startY
    this.flingStartScore = startScore
  }

  /**
   * Call each flying frame. Height/score unlocks are per-fling and can toast mid-air.
   */
  onFlightFrame(ballY: number, currentScore: number): void {
    const climb = Math.max(0, ballY - this.flingStartY)
    if (climb > this.flingPeakClimb) this.flingPeakClimb = climb
    this.unlockFlingHeight(this.flingPeakClimb)
    this.unlockFlingScore(currentScore - this.flingStartScore)
  }

  /** Catch-moment speed gates the speed achievements. */
  onCatch(vx: number, vy: number, currentScore: number): void {
    this.unlockCatchSpeed(Math.hypot(vx, vy))
    this.unlockFlingHeight(this.flingPeakClimb)
    this.unlockFlingScore(currentScore - this.flingStartScore)
    this.resetFling()
  }

  onObstacleHit(kind: "platform" | "bumper" | "portal" | "arrow", arrowDown = false): void {
    if (!this.flingHadHit && kind === "arrow") {
      this.flingFirstHitWasArrow = true
    }
    this.flingHadHit = true
    this.flingObstacles += 1
    if (kind === "arrow" && arrowDown) this.flingHitDownArrow = true
    this.unlockObstacleThresholds(this.flingObstacles)
  }

  onTurretHit(): void {
    this.flingHitTurret = true
  }

  onCoinsCollected(count: number): void {
    if (count <= 0) return
    this.coinsCollected += count
    this.checkCoinThresholds()
    this.save()
  }

  /** Seed progress from an existing lifetime bank (first load / migration). */
  seedCoinsFromBank(bank: number): void {
    if (bank <= this.coinsCollected) return
    this.coinsCollected = bank
    this.checkCoinThresholds()
    // Historical seed unlocks should not toast.
    this.pendingUnlocks = []
    this.save()
  }

  private checkCoinThresholds(): void {
    const total = this.coinsCollected
    if (total >= 10) this.unlock("coins-10")
    if (total >= 50) this.unlock("coins-50")
    if (total >= 150) this.unlock("coins-150")
    if (total >= 400) this.unlock("coins-400")
  }

  onGameOver(ctx: AchievementGameOverContext): void {
    if (this.flingFirstHitWasArrow) this.unlock("fail-bamboozled")
    if (this.flingHitDownArrow) this.unlock("fail-southbound")
    if (!this.flingHadHit) this.unlock("fail-whiff")

    const dist = Math.hypot(ctx.ballX - ctx.slingX, ctx.ballY - ctx.slingY)
    if (dist <= ctx.catchRadius + 48) this.unlock("fail-so-close")

    if (this.flingPeakClimb >= 1000) this.unlock("fail-icarus")
    if (this.flingHitTurret) this.unlock("fail-turret")
    if (this.runFlings <= 1 && ctx.runScore < 100) this.unlock("fail-cold-open")
  }

  private unlockCatchSpeed(speed: number): void {
    // Max normal launch ≈ 1,208; max POW launch ≈ 2,415.
    if (speed >= 900) this.unlock("speed-catch-900")
    if (speed >= 1200) this.unlock("speed-catch-1200")
    if (speed >= 1800) this.unlock("speed-catch-1800")
    if (speed >= 2300) this.unlock("speed-catch-2300")
  }

  private unlockFlingHeight(climb: number): void {
    const h = Math.floor(climb)
    if (h >= 400) this.unlock("height-fling-400")
    if (h >= 1000) this.unlock("height-fling-1000")
    if (h >= 2500) this.unlock("height-fling-2500")
    if (h >= 5000) this.unlock("height-fling-5000")
  }

  private unlockFlingScore(points: number): void {
    const s = Math.floor(points)
    if (s >= 300) this.unlock("score-fling-300")
    if (s >= 800) this.unlock("score-fling-800")
    if (s >= 2000) this.unlock("score-fling-2000")
    if (s >= 5000) this.unlock("score-fling-5000")
  }

  private unlockObstacleThresholds(count: number): void {
    if (count >= 3) this.unlock("obstacles-3")
    if (count >= 6) this.unlock("obstacles-6")
    if (count >= 10) this.unlock("obstacles-10")
    if (count >= 15) this.unlock("obstacles-15")
  }

  private unlock(id: string): void {
    if (!DEF_BY_ID.has(id) || this.unlocked.has(id)) return
    this.unlocked.add(id)
    this.pendingUnlocks.push(id)
    this.save()
  }

  private resetFling(): void {
    this.flingObstacles = 0
    this.flingHadHit = false
    this.flingFirstHitWasArrow = false
    this.flingHitDownArrow = false
    this.flingHitTurret = false
    this.flingPeakClimb = 0
    this.flingStartY = 0
    this.flingStartScore = 0
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(ACHIEVEMENTS_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as AchievementsPersist
      if (!data || !Array.isArray(data.unlocked)) return
      for (const id of data.unlocked) {
        if (typeof id === "string" && DEF_BY_ID.has(id)) this.unlocked.add(id)
      }
      const coins = Number(data.coinsCollected)
      if (Number.isFinite(coins) && coins > 0) this.coinsCollected = coins
    } catch {
      // ignore
    }
  }

  private save(): void {
    if (!this.persist) return
    try {
      const data: AchievementsPersist = {
        unlocked: [...this.unlocked],
        coinsCollected: this.coinsCollected,
      }
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data))
    } catch {
      // ignore
    }
  }
}
