/**
 * Daily missions: three rotating challenges (easy / medium / hard) with coin rewards.
 * Missions re-roll each local calendar day; progress persists within the day.
 */

import { todayKey } from "./dailyLogin"

export const DAILY_MISSIONS_KEY = "sling-climb-daily-missions"

export type MissionDifficulty = "easy" | "medium" | "hard"

/**
 * What the mission counts.
 * Fling-scoped counters reset each launch; run-scoped accumulate until game over.
 */
export type MissionKind =
  | "sameBumperFling"
  | "portalsFling"
  | "bumpersFling"
  | "platformsFling"
  | "arrowsFling"
  | "coinsFling"
  | "coinsRun"
  | "bonusRun"
  | "comboFling"
  | "heightRun"
  | "catchesRun"
  | "scoreRun"

export interface MissionDef {
  id: string
  kind: MissionKind
  difficulty: MissionDifficulty
  /** Target count (hits, coins, combo level, height px, score points, …). */
  target: number
  /** Coin reward on claim. */
  reward: number
  label: string
}

export interface MissionProgress {
  id: string
  /** Best progress toward target so far today (capped at target when complete). */
  progress: number
  claimed: boolean
}

export interface DailyMissionSlot {
  def: MissionDef
  progress: number
  claimed: boolean
  complete: boolean
}

interface MissionsPersist {
  date: string
  missionIds: string[]
  progress: Record<string, { progress: number; claimed: boolean }>
}

/** Seeded mulberry32 — stable picks for a given day string. */
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickOne<T>(pool: readonly T[], rand: () => number, usedKinds: Set<MissionKind>): T {
  const available = pool.filter((m) => {
    const kind = (m as MissionDef).kind
    return !usedKinds.has(kind)
  })
  const list = available.length > 0 ? available : pool
  return list[Math.floor(rand() * list.length)]!
}

export const MISSION_POOL: readonly MissionDef[] = [
  // Easy
  {
    id: "easy-same-bumper-3",
    kind: "sameBumperFling",
    difficulty: "easy",
    target: 3,
    reward: 5,
    label: "Hit the same bumper 3× in one fling",
  },
  {
    id: "easy-portals-3",
    kind: "portalsFling",
    difficulty: "easy",
    target: 3,
    reward: 5,
    label: "Travel through 3 portals in one fling",
  },
  {
    id: "easy-coins-3",
    kind: "coinsRun",
    difficulty: "easy",
    target: 3,
    reward: 5,
    label: "Collect 3 coins in 1 run",
  },
  {
    id: "easy-platforms-5",
    kind: "platformsFling",
    difficulty: "easy",
    target: 5,
    reward: 5,
    label: "Bounce 5 platforms in one fling",
  },
  {
    id: "easy-bumpers-4",
    kind: "bumpersFling",
    difficulty: "easy",
    target: 4,
    reward: 5,
    label: "Hit 4 bumpers in one fling",
  },
  {
    id: "easy-combo-5",
    kind: "comboFling",
    difficulty: "easy",
    target: 5,
    reward: 5,
    label: "Reach a 5× combo in one fling",
  },
  {
    id: "easy-coins-fling-1",
    kind: "coinsFling",
    difficulty: "easy",
    target: 1,
    reward: 5,
    label: "Collect 1 coin in one fling",
  },
  {
    id: "easy-catch-3",
    kind: "catchesRun",
    difficulty: "easy",
    target: 3,
    reward: 5,
    label: "Catch the ball 3 times in 1 run",
  },
  // Medium
  {
    id: "med-same-bumper-4",
    kind: "sameBumperFling",
    difficulty: "medium",
    target: 4,
    reward: 10,
    label: "Hit the same bumper 4× in one fling",
  },
  {
    id: "med-portals-4",
    kind: "portalsFling",
    difficulty: "medium",
    target: 4,
    reward: 10,
    label: "Travel through 4 portals in one fling",
  },
  {
    id: "med-coins-3",
    kind: "coinsRun",
    difficulty: "medium",
    target: 3,
    reward: 10,
    label: "Collect 3 coins in 1 run",
  },
  {
    id: "med-arrows-2",
    kind: "arrowsFling",
    difficulty: "medium",
    target: 2,
    reward: 10,
    label: "Hit 2 arrow pads in one fling",
  },
  {
    id: "med-combo-6",
    kind: "comboFling",
    difficulty: "medium",
    target: 6,
    reward: 10,
    label: "Reach a 6× combo in one fling",
  },
  {
    id: "med-height-2000",
    kind: "heightRun",
    difficulty: "medium",
    target: 2000,
    reward: 10,
    label: "Climb 2,000 height in 1 run",
  },
  {
    id: "med-bonus-2",
    kind: "bonusRun",
    difficulty: "medium",
    target: 2,
    reward: 10,
    label: "Land on 2 bonus platforms in 1 run",
  },
  {
    id: "med-platforms-6",
    kind: "platformsFling",
    difficulty: "medium",
    target: 6,
    reward: 10,
    label: "Bounce 6 platforms in one fling",
  },
  {
    id: "med-coins-fling-2",
    kind: "coinsFling",
    difficulty: "medium",
    target: 2,
    reward: 10,
    label: "Collect 2 coins in one fling",
  },
  // Hard
  {
    id: "hard-same-bumper-5",
    kind: "sameBumperFling",
    difficulty: "hard",
    target: 5,
    reward: 15,
    label: "Hit the same bumper 5× in one fling",
  },
  {
    id: "hard-portals-5",
    kind: "portalsFling",
    difficulty: "hard",
    target: 5,
    reward: 15,
    label: "Travel through 5 portals in one fling",
  },
  {
    id: "hard-coins-4",
    kind: "coinsRun",
    difficulty: "hard",
    target: 4,
    reward: 15,
    label: "Collect 4 coins in 1 run",
  },
  {
    id: "hard-combo-12",
    kind: "comboFling",
    difficulty: "hard",
    target: 12,
    reward: 15,
    label: "Reach a 12× combo in one fling",
  },
  {
    id: "hard-height-4500",
    kind: "heightRun",
    difficulty: "hard",
    target: 4500,
    reward: 15,
    label: "Climb 4,500 height in 1 run",
  },
  {
    id: "hard-score-5000",
    kind: "scoreRun",
    difficulty: "hard",
    target: 5000,
    reward: 15,
    label: "Score 5,000 points in 1 run",
  },
  {
    id: "hard-bumpers-8",
    kind: "bumpersFling",
    difficulty: "hard",
    target: 8,
    reward: 15,
    label: "Hit 8 bumpers in one fling",
  },
]

const DIFFICULTIES: readonly MissionDifficulty[] = ["easy", "medium", "hard"]

function poolFor(diff: MissionDifficulty): MissionDef[] {
  return MISSION_POOL.filter((m) => m.difficulty === diff)
}

function defById(id: string): MissionDef | undefined {
  return MISSION_POOL.find((m) => m.id === id)
}

/** Pick one easy, one medium, one hard for a calendar day (deterministic). */
export function pickMissionsForDay(date = todayKey()): MissionDef[] {
  const rand = mulberry32(hashString(`missions:${date}`))
  const used = new Set<MissionKind>()
  const picked: MissionDef[] = []
  for (const diff of DIFFICULTIES) {
    const choice = pickOne(poolFor(diff), rand, used)
    used.add(choice.kind)
    picked.push(choice)
  }
  return picked
}

export class DailyMissionsStore {
  private persist: boolean
  private date = ""
  private missionIds: string[] = []
  private byId = new Map<string, MissionProgress>()

  /** Per-fling counters (reset on each launch). */
  private flingPortals = 0
  private flingBumpers = 0
  private flingPlatforms = 0
  private flingArrows = 0
  private flingCoins = 0
  private flingBumperHits = new Map<string, number>()

  /** Per-run counters (reset when a real run starts). */
  private runCoins = 0
  private runBonus = 0
  private runCatches = 0

  constructor(persist = true) {
    this.persist = persist
    if (this.persist) this.load()
    this.ensureToday()
  }

  /** Today's three mission slots in easy → medium → hard order. */
  get slots(): DailyMissionSlot[] {
    this.ensureToday()
    return this.missionIds.map((id) => {
      const def = defById(id)!
      const prog = this.byId.get(id)!
      return {
        def,
        progress: prog.progress,
        claimed: prog.claimed,
        complete: prog.progress >= def.target,
      }
    })
  }

  /** True if any mission is complete and unclaimed. */
  get hasClaimable(): boolean {
    return this.slots.some((s) => s.complete && !s.claimed)
  }

  /** True if login badge should also light for missions. */
  get anyIncomplete(): boolean {
    return this.slots.some((s) => !s.claimed)
  }

  ensureToday(): void {
    const today = todayKey()
    if (this.date === today && this.missionIds.length === 3) return
    this.date = today
    const picked = pickMissionsForDay(today)
    this.missionIds = picked.map((m) => m.id)
    this.byId = new Map(
      picked.map((m) => [m.id, { id: m.id, progress: 0, claimed: false }]),
    )
    this.save()
  }

  claim(id: string, addCoins: (n: number) => void): number | null {
    this.ensureToday()
    const def = defById(id)
    const prog = this.byId.get(id)
    if (!def || !prog || prog.claimed || prog.progress < def.target) return null
    prog.claimed = true
    addCoins(def.reward)
    this.save()
    return def.reward
  }

  /** Reset run-scoped counters when the player starts a real run. */
  onRunStart(): void {
    this.runCoins = 0
    this.runBonus = 0
    this.runCatches = 0
    this.resetFling()
  }

  /** Reset fling-scoped counters on each launch. */
  onFlingStart(): void {
    this.resetFling()
  }

  onCatch(): void {
    this.runCatches += 1
    this.bumpKind("catchesRun", this.runCatches)
    this.resetFling()
  }

  onBumperHit(key: string | null): void {
    this.flingBumpers += 1
    this.bumpKind("bumpersFling", this.flingBumpers)
    if (key) {
      const n = (this.flingBumperHits.get(key) ?? 0) + 1
      this.flingBumperHits.set(key, n)
      let best = 0
      for (const v of this.flingBumperHits.values()) best = Math.max(best, v)
      this.bumpKind("sameBumperFling", best)
    }
  }

  onPortal(): void {
    this.flingPortals += 1
    this.bumpKind("portalsFling", this.flingPortals)
  }

  onPlatform(): void {
    this.flingPlatforms += 1
    this.bumpKind("platformsFling", this.flingPlatforms)
  }

  onArrow(): void {
    this.flingArrows += 1
    this.bumpKind("arrowsFling", this.flingArrows)
  }

  onCoins(count: number): void {
    if (count <= 0) return
    this.flingCoins += count
    this.runCoins += count
    this.bumpKind("coinsFling", this.flingCoins)
    this.bumpKind("coinsRun", this.runCoins)
  }

  onBonus(): void {
    this.runBonus += 1
    this.bumpKind("bonusRun", this.runBonus)
  }

  onCombo(combo: number): void {
    this.bumpKind("comboFling", combo)
  }

  onHeight(climb: number): void {
    this.bumpKind("heightRun", Math.floor(climb))
  }

  onScore(score: number): void {
    this.bumpKind("scoreRun", Math.floor(score))
  }

  private resetFling(): void {
    this.flingPortals = 0
    this.flingBumpers = 0
    this.flingPlatforms = 0
    this.flingArrows = 0
    this.flingCoins = 0
    this.flingBumperHits.clear()
  }

  private bumpKind(kind: MissionKind, value: number): void {
    this.ensureToday()
    let changed = false
    for (const id of this.missionIds) {
      const def = defById(id)
      const prog = this.byId.get(id)
      if (!def || !prog || def.kind !== kind || prog.claimed) continue
      const next = Math.min(def.target, Math.max(prog.progress, value))
      if (next > prog.progress) {
        prog.progress = next
        changed = true
      }
    }
    if (changed) this.save()
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(DAILY_MISSIONS_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as MissionsPersist
      if (!data || typeof data.date !== "string" || !Array.isArray(data.missionIds)) {
        return
      }
      if (data.date !== todayKey()) return
      const ids = data.missionIds.filter((id) => defById(id))
      if (ids.length !== 3) return
      this.date = data.date
      this.missionIds = ids
      this.byId = new Map()
      for (const id of ids) {
        const p = data.progress?.[id]
        this.byId.set(id, {
          id,
          progress: Math.max(0, Number(p?.progress) || 0),
          claimed: Boolean(p?.claimed),
        })
      }
    } catch {
      // ignore
    }
  }

  private save(): void {
    if (!this.persist) return
    try {
      const progress: MissionsPersist["progress"] = {}
      for (const [id, p] of this.byId) {
        progress[id] = { progress: p.progress, claimed: p.claimed }
      }
      const data: MissionsPersist = {
        date: this.date,
        missionIds: this.missionIds,
        progress,
      }
      localStorage.setItem(DAILY_MISSIONS_KEY, JSON.stringify(data))
    } catch {
      // ignore
    }
  }
}
