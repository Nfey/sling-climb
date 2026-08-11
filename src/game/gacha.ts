/**
 * Generic cosmetic gacha: coin pulls, rarity weights, pity, duplicate refunds.
 */

import { DUPLICATE_REFUND, type CosmeticRarity } from "./rarity"
import {
  GACHA_PITY_KEY,
  HAT_VARIANTS,
  LEGACY_GACHA_PITY_KEY,
  findHatVariant,
  hatsByRarity,
  type HatVariant,
} from "./hats"
import {
  TRAIL_GACHA_PITY_KEY,
  TRAIL_VARIANTS,
  findTrailVariant,
  trailsByRarity,
  type TrailVariant,
} from "./trails"

/** Coins spent per single pull (hats and trails). */
export const GACHA_PULL_COST = 12

/** Pulls without rare+ before a guaranteed rare-or-better. */
export const GACHA_PITY_THRESHOLD = 15

const RARITY_WEIGHTS: { rarity: CosmeticRarity; weight: number }[] = [
  { rarity: "common", weight: 60 },
  { rarity: "uncommon", weight: 25 },
  { rarity: "rare", weight: 12 },
  { rarity: "epic", weight: 3 },
]

export type GachaPool = "hat" | "trail"

export interface GachaItem {
  id: string
  name: string
  rarity: CosmeticRarity
}

export interface GachaPullResult {
  pool: GachaPool
  item: GachaItem
  /** Present when pool === "hat". */
  hat: HatVariant | null
  /** Present when pool === "trail". */
  trail: TrailVariant | null
  rarity: CosmeticRarity
  isNew: boolean
  coinsSpent: number
  duplicateRefund: number
  pityCounter: number
  pityTriggered: boolean
}

export class GachaStore {
  pityCounter = 0
  private persist: boolean
  private readonly storageKey: string
  private readonly legacyKey: string | null

  constructor(storageKey: string, persist = true, legacyKey: string | null = null) {
    this.storageKey = storageKey
    this.legacyKey = legacyKey
    this.persist = persist
    if (this.persist) this.load()
  }

  pullsUntilPity(): number {
    return Math.max(0, GACHA_PITY_THRESHOLD - this.pityCounter)
  }

  pull(opts: {
    pool: GachaPool
    lifetimeCoins: number
    ownedIds: ReadonlySet<string>
    spendCoins: (amount: number) => boolean
    grant: (id: string) => void
    addCoins: (n: number) => void
  }): GachaPullResult | null {
    if (opts.lifetimeCoins < GACHA_PULL_COST) return null
    if (!opts.spendCoins(GACHA_PULL_COST)) return null

    const pityTriggered = this.pityCounter + 1 >= GACHA_PITY_THRESHOLD
    const rarity = pityTriggered ? rollRareOrBetter() : rollRarity()
    const picked = pickItem(opts.pool, rarity)
    if (!picked) return null

    const isNew = !opts.ownedIds.has(picked.item.id)
    let duplicateRefund = 0
    if (isNew) {
      opts.grant(picked.item.id)
    } else {
      duplicateRefund = DUPLICATE_REFUND[picked.item.rarity]
      opts.addCoins(duplicateRefund)
    }

    if (
      picked.item.rarity === "rare" ||
      picked.item.rarity === "epic" ||
      pityTriggered
    ) {
      this.pityCounter = 0
    } else {
      this.pityCounter += 1
    }
    this.save()

    return {
      pool: opts.pool,
      item: picked.item,
      hat: picked.hat,
      trail: picked.trail,
      rarity: picked.item.rarity,
      isNew,
      coinsSpent: GACHA_PULL_COST,
      duplicateRefund,
      pityCounter: this.pityCounter,
      pityTriggered,
    }
  }

  private load(): void {
    try {
      let raw = localStorage.getItem(this.storageKey)
      if ((raw == null || raw === "") && this.legacyKey) {
        raw = localStorage.getItem(this.legacyKey)
      }
      const n = raw ? Number(raw) : 0
      this.pityCounter = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
    } catch {
      this.pityCounter = 0
    }
  }

  private save(): void {
    if (!this.persist) return
    try {
      localStorage.setItem(this.storageKey, String(this.pityCounter))
    } catch {
      // ignore
    }
  }
}

export function createHatGacha(persist = true): GachaStore {
  return new GachaStore(GACHA_PITY_KEY, persist, LEGACY_GACHA_PITY_KEY)
}

export function createTrailGacha(persist = true): GachaStore {
  return new GachaStore(TRAIL_GACHA_PITY_KEY, persist)
}

function rollRarity(): CosmeticRarity {
  const total = RARITY_WEIGHTS.reduce((s, r) => s + r.weight, 0)
  let roll = Math.random() * total
  for (const entry of RARITY_WEIGHTS) {
    roll -= entry.weight
    if (roll <= 0) return entry.rarity
  }
  return "common"
}

function rollRareOrBetter(): CosmeticRarity {
  return Math.random() < 0.8 ? "rare" : "epic"
}

function pickItem(
  pool: GachaPool,
  rarity: CosmeticRarity,
): { item: GachaItem; hat: HatVariant | null; trail: TrailVariant | null } | null {
  if (pool === "hat") {
    const list = hatsByRarity(rarity)
    const hat =
      list[Math.floor(Math.random() * list.length)] ??
      findHatVariant(HAT_VARIANTS[0]!.id) ??
      null
    if (!hat) return null
    return { item: { id: hat.id, name: hat.name, rarity: hat.rarity }, hat, trail: null }
  }
  const list = trailsByRarity(rarity)
  const trail =
    list[Math.floor(Math.random() * list.length)] ??
    findTrailVariant(TRAIL_VARIANTS[0]!.id) ??
    null
  if (!trail) return null
  return {
    item: { id: trail.id, name: trail.name, rarity: trail.rarity },
    hat: null,
    trail,
  }
}
