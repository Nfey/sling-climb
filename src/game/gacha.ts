/**
 * Hat gacha: coin pulls with rarity weights, pity, and duplicate refunds.
 */

import {
  GACHA_PITY_KEY,
  HAT_DUPLICATE_REFUND,
  HAT_VARIANTS,
  findHatVariant,
  hatsByRarity,
  type HatRarity,
  type HatVariant,
} from "./hats"

/** Coins spent per single pull. */
export const GACHA_PULL_COST = 12

/** Pulls without rare+ before a guaranteed rare-or-better. */
export const GACHA_PITY_THRESHOLD = 15

const RARITY_WEIGHTS: { rarity: HatRarity; weight: number }[] = [
  { rarity: "common", weight: 60 },
  { rarity: "uncommon", weight: 25 },
  { rarity: "rare", weight: 12 },
  { rarity: "epic", weight: 3 },
]

export interface GachaPullResult {
  hat: HatVariant
  rarity: HatRarity
  isNew: boolean
  coinsSpent: number
  duplicateRefund: number
  pityCounter: number
  pityTriggered: boolean
}

export class GachaStore {
  /** Pulls since last rare+ (or start). */
  pityCounter = 0
  private persist: boolean

  constructor(persist = true) {
    this.persist = persist
    if (this.persist) this.load()
  }

  pullsUntilPity(): number {
    return Math.max(0, GACHA_PITY_THRESHOLD - this.pityCounter)
  }

  pull(opts: {
    lifetimeCoins: number
    ownedHatIds: ReadonlySet<string>
    spendCoins: (amount: number) => boolean
    grantHat: (id: string) => void
    addCoins: (n: number) => void
  }): GachaPullResult | null {
    if (opts.lifetimeCoins < GACHA_PULL_COST) return null
    if (!opts.spendCoins(GACHA_PULL_COST)) return null

    const pityTriggered = this.pityCounter + 1 >= GACHA_PITY_THRESHOLD
    const rarity = pityTriggered ? rollRareOrBetter() : rollRarity()
    const hat = pickRandomHat(rarity)
    if (!hat) return null

    const isNew = !opts.ownedHatIds.has(hat.id)
    let duplicateRefund = 0
    if (isNew) {
      opts.grantHat(hat.id)
    } else {
      duplicateRefund = HAT_DUPLICATE_REFUND[hat.rarity]
      opts.addCoins(duplicateRefund)
    }

    if (hat.rarity === "rare" || hat.rarity === "epic" || pityTriggered) {
      this.pityCounter = 0
    } else {
      this.pityCounter += 1
    }
    this.save()

    return {
      hat,
      rarity: hat.rarity,
      isNew,
      coinsSpent: GACHA_PULL_COST,
      duplicateRefund,
      pityCounter: this.pityCounter,
      pityTriggered,
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(GACHA_PITY_KEY)
      const n = raw ? Number(raw) : 0
      this.pityCounter = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
    } catch {
      this.pityCounter = 0
    }
  }

  private save(): void {
    if (!this.persist) return
    try {
      localStorage.setItem(GACHA_PITY_KEY, String(this.pityCounter))
    } catch {
      // ignore
    }
  }
}

function rollRarity(): HatRarity {
  const total = RARITY_WEIGHTS.reduce((s, r) => s + r.weight, 0)
  let roll = Math.random() * total
  for (const entry of RARITY_WEIGHTS) {
    roll -= entry.weight
    if (roll <= 0) return entry.rarity
  }
  return "common"
}

function rollRareOrBetter(): HatRarity {
  // ~80% rare, 20% epic when pity fires
  return Math.random() < 0.8 ? "rare" : "epic"
}

function pickRandomHat(rarity: HatRarity): HatVariant | null {
  const pool = hatsByRarity(rarity)
  if (pool.length === 0) {
    return findHatVariant(HAT_VARIANTS[0]!.id) ?? null
  }
  return pool[Math.floor(Math.random() * pool.length)]!
}
