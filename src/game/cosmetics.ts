export type SlingshotStyle =
  | "classic"
  | "twig"
  | "iron"
  | "vine"
  | "royal"
  | "crimson"
  | "golden"
  | "rainbow"

export type BallStyle =
  | "classic"
  | "soccer"
  | "baseball"
  | "wiffle"
  | "tennis"
  | "pingpong"
  | "basketball"
  | "football"
  | "golf"
  | "beach"
  | "bowling"
  | "volleyball"
  | "ruby"
  | "emerald"
  | "sapphire"
  | "amethyst"
  | "topaz"
  | "winged"
  | "rainbow"

export type BallUnlockKind = "height" | "points"

export interface BallUnlock {
  kind: BallUnlockKind
  value: number
}

export interface SlingshotVariant {
  id: string
  name: string
  price: number
  style: SlingshotStyle
}

export interface BallVariant {
  id: string
  name: string
  style: BallStyle
  unlock: BallUnlock
}

export const SLINGSHOT_VARIANTS: readonly SlingshotVariant[] = [
  { id: "twig", name: "Twig", price: 5, style: "twig" },
  { id: "iron", name: "Iron", price: 10, style: "iron" },
  { id: "vine", name: "Vine", price: 15, style: "vine" },
  { id: "royal", name: "Royal", price: 20, style: "royal" },
  { id: "crimson", name: "Crimson", price: 25, style: "crimson" },
  { id: "golden", name: "Golden", price: 50, style: "golden" },
  { id: "rainbow", name: "Rainbow", price: 100, style: "rainbow" },
]

/** Sports balls unlocked by lifetime best score (points). */
export const POINTS_BALL_VARIANTS: readonly BallVariant[] = [
  { id: "soccer", name: "Soccer", style: "soccer", unlock: { kind: "points", value: 5_000 } },
  { id: "baseball", name: "Baseball", style: "baseball", unlock: { kind: "points", value: 10_000 } },
  { id: "wiffle", name: "Wiffle", style: "wiffle", unlock: { kind: "points", value: 20_000 } },
  { id: "tennis", name: "Tennis", style: "tennis", unlock: { kind: "points", value: 30_000 } },
  { id: "pingpong", name: "Ping Pong", style: "pingpong", unlock: { kind: "points", value: 40_000 } },
  { id: "basketball", name: "Basketball", style: "basketball", unlock: { kind: "points", value: 50_000 } },
  { id: "football", name: "Football", style: "football", unlock: { kind: "points", value: 100_000 } },
  { id: "golf", name: "Golf", style: "golf", unlock: { kind: "points", value: 150_000 } },
  { id: "beach", name: "Beach", style: "beach", unlock: { kind: "points", value: 200_000 } },
  { id: "bowling", name: "Bowling", style: "bowling", unlock: { kind: "points", value: 250_000 } },
  { id: "volleyball", name: "Volleyball", style: "volleyball", unlock: { kind: "points", value: 500_000 } },
]

/** Gem & special balls unlocked by best climb height. */
export const HEIGHT_BALL_VARIANTS: readonly BallVariant[] = [
  { id: "ruby", name: "Ruby", style: "ruby", unlock: { kind: "height", value: 5000 } },
  { id: "emerald", name: "Emerald", style: "emerald", unlock: { kind: "height", value: 10000 } },
  { id: "sapphire", name: "Sapphire", style: "sapphire", unlock: { kind: "height", value: 15000 } },
  { id: "amethyst", name: "Amethyst", style: "amethyst", unlock: { kind: "height", value: 20000 } },
  { id: "topaz", name: "Topaz", style: "topaz", unlock: { kind: "height", value: 25000 } },
  { id: "winged", name: "Winged", style: "winged", unlock: { kind: "height", value: 50000 } },
  { id: "rainbow", name: "Rainbow", style: "rainbow", unlock: { kind: "height", value: 100000 } },
]

export const BALL_VARIANTS: readonly BallVariant[] = [
  ...POINTS_BALL_VARIANTS,
  ...HEIGHT_BALL_VARIANTS,
]

export const SLINGSHOT_UNLOCKS_KEY = "sling-climb-slingshot-unlocks"
export const EQUIPPED_SLINGSHOT_KEY = "sling-climb-equipped-slingshot"
export const EQUIPPED_BALL_KEY = "sling-climb-equipped-ball"

/** Sentinel id for the built-in default look (always available). */
export const DEFAULT_COSMETIC_ID = "default"

export function findBallVariant(id: string): BallVariant | undefined {
  return BALL_VARIANTS.find((v) => v.id === id)
}

export function findSlingshotVariant(id: string): SlingshotVariant | undefined {
  return SLINGSHOT_VARIANTS.find((v) => v.id === id)
}

export function isBallVariantUnlocked(
  variant: BallVariant,
  bestHeight: number,
  highScore: number,
): boolean {
  if (variant.unlock.kind === "height") return bestHeight >= variant.unlock.value
  return highScore >= variant.unlock.value
}

export class CosmeticsStore {
  private slingshotUnlocked = new Set<string>()
  equippedSlingshotId = DEFAULT_COSMETIC_ID
  equippedBallId = DEFAULT_COSMETIC_ID
  private persist: boolean

  constructor(persist = true) {
    this.persist = persist
    if (this.persist) this.load()
  }

  isSlingshotOwned(id: string): boolean {
    return this.slingshotUnlocked.has(id)
  }

  isBallUnlocked(id: string, bestHeight: number, highScore: number): boolean {
    const variant = findBallVariant(id)
    if (!variant) return false
    return isBallVariantUnlocked(variant, bestHeight, highScore)
  }

  cycleSlingshotMenu(delta: number): void {
    const allIds = [DEFAULT_COSMETIC_ID, ...SLINGSHOT_VARIANTS.map((v) => v.id)]
    const current = allIds.indexOf(this.equippedSlingshotId)
    const next =
      current >= 0
        ? allIds[(current + delta + allIds.length) % allIds.length]!
        : DEFAULT_COSMETIC_ID
    this.equippedSlingshotId = next
    this.saveEquipped()
  }

  cycleBallMenu(delta: number): void {
    const allIds = [DEFAULT_COSMETIC_ID, ...BALL_VARIANTS.map((v) => v.id)]
    const current = allIds.indexOf(this.equippedBallId)
    const next =
      current >= 0
        ? allIds[(current + delta + allIds.length) % allIds.length]!
        : DEFAULT_COSMETIC_ID
    this.equippedBallId = next
    this.saveEquipped()
  }

  purchaseSlingshot(id: string, spendCoins: (amount: number) => boolean): boolean {
    const variant = findSlingshotVariant(id)
    if (!variant || this.isSlingshotOwned(id)) return false
    if (!spendCoins(variant.price)) return false
    this.slingshotUnlocked.add(id)
    this.equipSlingshot(id)
    if (this.persist) this.saveUnlocks()
    return true
  }

  equipSlingshot(id: string): void {
    if (id === DEFAULT_COSMETIC_ID || this.isSlingshotOwned(id)) {
      this.equippedSlingshotId = id
      this.saveEquipped()
    }
  }

  equipBall(id: string): void {
    this.equippedBallId = id
    this.saveEquipped()
  }

  /** Active slingshot style for gameplay (owned variants only). */
  getEquippedSlingshotStyle(): SlingshotStyle {
    if (
      this.equippedSlingshotId !== DEFAULT_COSMETIC_ID &&
      !this.isSlingshotOwned(this.equippedSlingshotId)
    ) {
      return "classic"
    }
    if (this.equippedSlingshotId === DEFAULT_COSMETIC_ID) return "classic"
    return findSlingshotVariant(this.equippedSlingshotId)?.style ?? "classic"
  }

  /** Active ball style for gameplay (unlocked variants only). */
  getEquippedBallStyle(bestHeight: number, highScore: number): BallStyle {
    if (this.equippedBallId === DEFAULT_COSMETIC_ID) return "classic"
    if (!this.isBallUnlocked(this.equippedBallId, bestHeight, highScore)) return "classic"
    return findBallVariant(this.equippedBallId)?.style ?? "classic"
  }

  getSelectedSlingshotStyle(): SlingshotStyle {
    if (this.equippedSlingshotId === DEFAULT_COSMETIC_ID) return "classic"
    return findSlingshotVariant(this.equippedSlingshotId)?.style ?? "classic"
  }

  getSelectedBallStyle(): BallStyle {
    if (this.equippedBallId === DEFAULT_COSMETIC_ID) return "classic"
    return findBallVariant(this.equippedBallId)?.style ?? "classic"
  }

  getSelectedBallVariant(): BallVariant | null {
    if (this.equippedBallId === DEFAULT_COSMETIC_ID) return null
    return findBallVariant(this.equippedBallId) ?? null
  }

  isSlingshotSelectionLocked(): boolean {
    return (
      this.equippedSlingshotId !== DEFAULT_COSMETIC_ID &&
      !this.isSlingshotOwned(this.equippedSlingshotId)
    )
  }

  isBallSelectionLocked(bestHeight: number, highScore: number): boolean {
    return (
      this.equippedBallId !== DEFAULT_COSMETIC_ID &&
      !this.isBallUnlocked(this.equippedBallId, bestHeight, highScore)
    )
  }

  previewSlingshotPrice(): number | null {
    if (this.equippedSlingshotId === DEFAULT_COSMETIC_ID) return null
    const variant = findSlingshotVariant(this.equippedSlingshotId)
    if (!variant || this.isSlingshotOwned(variant.id)) return null
    return variant.price
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(SLINGSHOT_UNLOCKS_KEY)
      if (raw) {
        const ids = JSON.parse(raw) as string[]
        if (Array.isArray(ids)) {
          for (const id of ids) {
            if (SLINGSHOT_VARIANTS.some((v) => v.id === id)) {
              this.slingshotUnlocked.add(id)
            }
          }
        }
      }
    } catch {
      // ignore
    }

    this.equippedSlingshotId =
      this.loadString(EQUIPPED_SLINGSHOT_KEY) ?? DEFAULT_COSMETIC_ID
    this.equippedBallId = this.loadString(EQUIPPED_BALL_KEY) ?? DEFAULT_COSMETIC_ID
  }

  private saveUnlocks(): void {
    try {
      localStorage.setItem(
        SLINGSHOT_UNLOCKS_KEY,
        JSON.stringify([...this.slingshotUnlocked]),
      )
    } catch {
      // ignore
    }
  }

  private saveEquipped(): void {
    if (!this.persist) return
    try {
      localStorage.setItem(EQUIPPED_SLINGSHOT_KEY, this.equippedSlingshotId)
      localStorage.setItem(EQUIPPED_BALL_KEY, this.equippedBallId)
    } catch {
      // ignore
    }
  }

  private loadString(key: string): string | null {
    try {
      const raw = localStorage.getItem(key)
      return raw && raw.length > 0 ? raw : null
    } catch {
      return null
    }
  }
}
