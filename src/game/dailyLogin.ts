/**
 * Daily login calendar: 7-day streak loop with coins, soft run boosts, and hats.
 */

import {
  HAT_VARIANTS,
  findHatVariant,
  hatsByRarity,
  type HatRarity,
  type HatVariant,
} from "./hats"

export const DAILY_LOGIN_KEY = "sling-climb-daily-login"
export const PENDING_BOOSTS_KEY = "sling-climb-pending-boosts"

export type DailyRewardKind = "coins" | "hat" | "pow" | "coinMult"

export interface DailyRewardDef {
  day: number
  kind: DailyRewardKind
  /** Coins granted, POW seconds, or coin-mult duration seconds. */
  amount: number
  /** For hat rewards. */
  rarity?: HatRarity
  /** Coin multiplier (default 2). */
  mult?: number
  label: string
}

/** Repeating 7-day streak calendar. */
export const DAILY_REWARDS: readonly DailyRewardDef[] = [
  { day: 1, kind: "coins", amount: 5, label: "5 coins" },
  { day: 2, kind: "coins", amount: 8, label: "8 coins" },
  { day: 3, kind: "pow", amount: 12, label: "Start POW" },
  { day: 4, kind: "coins", amount: 12, label: "12 coins" },
  { day: 5, kind: "hat", amount: 0, rarity: "common", label: "Common hat" },
  { day: 6, kind: "coinMult", amount: 40, mult: 2, label: "2× coins" },
  { day: 7, kind: "hat", amount: 15, rarity: "uncommon", label: "Uncommon hat" },
]

export interface PendingBoosts {
  /** Seconds of POW to apply at the start of the next run. */
  powSeconds: number
  /** Coin multiplier for the next run (1 = none). */
  coinMult: number
  /** Seconds the coin multiplier lasts after run start. */
  coinMultSeconds: number
}

export interface DailyClaimResult {
  day: number
  streak: number
  reward: DailyRewardDef
  coinsGranted: number
  hatGranted: HatVariant | null
  hatWasDuplicate: boolean
  boostGranted: PendingBoosts | null
  message: string
}

interface DailyPersist {
  lastClaimDate: string
  streak: number
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function daysBetween(a: string, b: string): number {
  const pa = a.split("-").map(Number)
  const pb = b.split("-").map(Number)
  const da = Date.UTC(pa[0]!, pa[1]! - 1, pa[2]!)
  const db = Date.UTC(pb[0]!, pb[1]! - 1, pb[2]!)
  return Math.round((db - da) / 86_400_000)
}

export function emptyBoosts(): PendingBoosts {
  return { powSeconds: 0, coinMult: 1, coinMultSeconds: 0 }
}

export class DailyLoginStore {
  lastClaimDate = ""
  streak = 0
  pending: PendingBoosts = emptyBoosts()
  private persist: boolean

  constructor(persist = true) {
    this.persist = persist
    if (this.persist) this.load()
  }

  /** 1–7 index for the next claim in the streak loop. */
  get nextDay(): number {
    if (!this.lastClaimDate) return 1
    const today = todayKey()
    if (this.lastClaimDate === today) {
      return ((this.streak - 1) % 7) + 1
    }
    return (this.streak % 7) + 1
  }

  get claimedToday(): boolean {
    return this.lastClaimDate === todayKey()
  }

  get canClaim(): boolean {
    return !this.claimedToday
  }

  rewardForDay(day: number): DailyRewardDef {
    return DAILY_REWARDS[(day - 1) % 7]!
  }

  /**
   * Which calendar cells are already claimed in the current 7-day cycle.
   * When claimed today, days 1..current are filled; otherwise previous streak progress.
   */
  claimedDaysInCycle(): Set<number> {
    const filled = new Set<number>()
    if (this.streak <= 0) return filled
    const current = ((this.streak - 1) % 7) + 1
    if (this.claimedToday) {
      for (let d = 1; d <= current; d++) filled.add(d)
    } else {
      // Previous streak progress before today's unclaimed day.
      const prev = ((this.streak - 1) % 7) + 1
      // If they broke the streak, nothing is filled this cycle.
      const today = todayKey()
      if (this.lastClaimDate && daysBetween(this.lastClaimDate, today) === 1) {
        for (let d = 1; d <= prev; d++) filled.add(d)
      }
    }
    return filled
  }

  claim(opts: {
    ownedHatIds: ReadonlySet<string>
    grantHat: (id: string) => void
    addCoins: (n: number) => void
  }): DailyClaimResult | null {
    if (!this.canClaim) return null

    const today = todayKey()
    let nextStreak = 1
    if (this.lastClaimDate) {
      const gap = daysBetween(this.lastClaimDate, today)
      if (gap === 1) nextStreak = this.streak + 1
      else if (gap === 0) return null
      else nextStreak = 1
    }

    const day = ((nextStreak - 1) % 7) + 1
    const reward = this.rewardForDay(day)
    let coinsGranted = 0
    let hatGranted: HatVariant | null = null
    let hatWasDuplicate = false
    let boostGranted: PendingBoosts | null = null

    if (reward.kind === "coins") {
      coinsGranted = reward.amount
      opts.addCoins(reward.amount)
    } else if (reward.kind === "pow") {
      this.pending.powSeconds += reward.amount
      boostGranted = {
        powSeconds: reward.amount,
        coinMult: 1,
        coinMultSeconds: 0,
      }
      this.savePending()
    } else if (reward.kind === "coinMult") {
      this.pending.coinMult = Math.max(this.pending.coinMult, reward.mult ?? 2)
      this.pending.coinMultSeconds += reward.amount
      boostGranted = {
        powSeconds: 0,
        coinMult: reward.mult ?? 2,
        coinMultSeconds: reward.amount,
      }
      this.savePending()
    } else if (reward.kind === "hat" && reward.rarity) {
      const pick = pickUnownedHat(reward.rarity, opts.ownedHatIds)
      if (pick) {
        opts.grantHat(pick.id)
        hatGranted = pick
      } else {
        // All owned — coin consolation.
        const fallback = reward.rarity === "uncommon" ? 6 : 3
        coinsGranted = fallback
        opts.addCoins(fallback)
        hatWasDuplicate = true
      }
      if (reward.amount > 0) {
        coinsGranted += reward.amount
        opts.addCoins(reward.amount)
      }
    }

    this.streak = nextStreak
    this.lastClaimDate = today
    this.save()

    const parts: string[] = []
    if (hatGranted) parts.push(hatGranted.name)
    if (coinsGranted > 0) parts.push(`+${coinsGranted} coins`)
    if (boostGranted?.powSeconds) parts.push(`POW ${boostGranted.powSeconds}s`)
    if (boostGranted && boostGranted.coinMult > 1) {
      parts.push(`${boostGranted.coinMult}× coins ${boostGranted.coinMultSeconds}s`)
    }
    if (hatWasDuplicate && !hatGranted) parts.push("hat bank (owned)")

    return {
      day,
      streak: nextStreak,
      reward,
      coinsGranted,
      hatGranted,
      hatWasDuplicate,
      boostGranted,
      message: parts.length > 0 ? parts.join(" · ") : reward.label,
    }
  }

  /** Consume pending boosts for a new player run. Returns what was applied. */
  consumeForRun(): PendingBoosts {
    const applied: PendingBoosts = {
      powSeconds: this.pending.powSeconds,
      coinMult: this.pending.coinMult > 1 ? this.pending.coinMult : 1,
      coinMultSeconds: this.pending.coinMult > 1 ? this.pending.coinMultSeconds : 0,
    }
    this.pending = emptyBoosts()
    this.savePending()
    return applied
  }

  hasPendingBoost(): boolean {
    return (
      this.pending.powSeconds > 0 ||
      (this.pending.coinMult > 1 && this.pending.coinMultSeconds > 0)
    )
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(DAILY_LOGIN_KEY)
      if (raw) {
        const data = JSON.parse(raw) as DailyPersist
        if (data && typeof data.lastClaimDate === "string") {
          this.lastClaimDate = data.lastClaimDate
          this.streak = Number.isFinite(data.streak) ? Math.max(0, data.streak) : 0
        }
      }
    } catch {
      // ignore
    }
    try {
      const raw = localStorage.getItem(PENDING_BOOSTS_KEY)
      if (raw) {
        const data = JSON.parse(raw) as PendingBoosts
        if (data) {
          this.pending = {
            powSeconds: Math.max(0, Number(data.powSeconds) || 0),
            coinMult: Math.max(1, Number(data.coinMult) || 1),
            coinMultSeconds: Math.max(0, Number(data.coinMultSeconds) || 0),
          }
        }
      }
    } catch {
      // ignore
    }
  }

  private save(): void {
    if (!this.persist) return
    try {
      const data: DailyPersist = {
        lastClaimDate: this.lastClaimDate,
        streak: this.streak,
      }
      localStorage.setItem(DAILY_LOGIN_KEY, JSON.stringify(data))
    } catch {
      // ignore
    }
  }

  private savePending(): void {
    if (!this.persist) return
    try {
      localStorage.setItem(PENDING_BOOSTS_KEY, JSON.stringify(this.pending))
    } catch {
      // ignore
    }
  }
}

function pickUnownedHat(
  rarity: HatRarity,
  owned: ReadonlySet<string>,
): HatVariant | null {
  const pool = hatsByRarity(rarity).filter((h) => !owned.has(h.id))
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]!
}

/** Prefer unowned of rarity; otherwise any of that rarity (for messaging). */
export function peekHatReward(
  rarity: HatRarity,
  owned: ReadonlySet<string>,
): HatVariant | null {
  return (
    pickUnownedHat(rarity, owned) ??
    hatsByRarity(rarity)[0] ??
    findHatVariant(HAT_VARIANTS[0]!.id) ??
    null
  )
}
