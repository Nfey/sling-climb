export type SlingshotStyle =
  | "classic"
  | "twig"
  | "iron"
  | "vine"
  | "royal"
  | "crimson"
  | "golden"
  | "rainbow"

import {
  BACKGROUND_VARIANTS,
  BACKGROUND_UNLOCKS_KEY,
  EQUIPPED_BACKGROUND_KEY,
  backgroundUnlockHint,
  findBackgroundVariant,
  isBackgroundVariantUnlocked,
} from "./backgrounds"
import type { BackgroundStyle } from "./backgrounds"
import {
  EQUIPPED_HAT_KEY,
  HAT_UNLOCKS_KEY,
  HAT_VARIANTS,
  findHatVariant,
  type HatStyle,
  type HatVariant,
} from "./hats"
import {
  EQUIPPED_TRAIL_KEY,
  TRAIL_UNLOCKS_KEY,
  TRAIL_VARIANTS,
  findTrailVariant,
  type TrailStyle,
} from "./trails"

export {
  BACKGROUND_VARIANTS,
  BACKGROUND_UNLOCKS_KEY,
  EQUIPPED_BACKGROUND_KEY,
  backgroundUnlockHint,
  findBackgroundVariant,
  isBackgroundVariantUnlocked,
} from "./backgrounds"
export type { BackgroundStyle, BackgroundVariant } from "./backgrounds"
export {
  EQUIPPED_HAT_KEY,
  HAT_UNLOCKS_KEY,
  HAT_VARIANTS,
  drawHatStyle,
  findHatVariant,
} from "./hats"
export type { HatRarity, HatStyle, HatVariant } from "./hats"
export {
  EQUIPPED_TRAIL_KEY,
  TRAIL_UNLOCKS_KEY,
  TRAIL_VARIANTS,
  drawTrailStyle,
  findTrailVariant,
  previewTrailPoints,
} from "./trails"
export type { TrailStyle, TrailVariant } from "./trails"
export { RARITY_COLOR, RARITY_LABEL } from "./rarity"
export type { CosmeticRarity } from "./rarity"

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

/** Ball ids hidden from the picker until visuals are ready. Remove ids to re-enable. */
export const TEMPORARILY_HIDDEN_BALL_IDS: ReadonlySet<string> = new Set([
  "tennis",
  "volleyball",
])

export function isBallVariantVisible(id: string): boolean {
  return !TEMPORARILY_HIDDEN_BALL_IDS.has(id)
}

export const VISIBLE_BALL_VARIANTS: readonly BallVariant[] = BALL_VARIANTS.filter((v) =>
  isBallVariantVisible(v.id),
)

export const SLINGSHOT_UNLOCKS_KEY = "sling-climb-slingshot-unlocks"
export const EQUIPPED_SLINGSHOT_KEY = "sling-climb-equipped-slingshot"
export const EQUIPPED_BALL_KEY = "sling-climb-equipped-ball"

/** Sentinel id for the built-in default look (always available). */
export const DEFAULT_COSMETIC_ID = "default"

export function findBallVariant(id: string): BallVariant | undefined {
  return BALL_VARIANTS.find((v) => v.id === id)
}

export function formatUnlockThreshold(value: number): string {
  if (value >= 1000) {
    const k = value / 1000
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`
  }
  return String(Math.round(value))
}

export function ballUnlockHint(variant: BallVariant): string {
  const label = formatUnlockThreshold(variant.unlock.value)
  return variant.unlock.kind === "points" ? `${label} score` : `${label} height`
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
  private backgroundUnlocked = new Set<string>()
  private hatUnlocked = new Set<string>()
  private trailUnlocked = new Set<string>()
  equippedSlingshotId = DEFAULT_COSMETIC_ID
  equippedBallId = DEFAULT_COSMETIC_ID
  equippedBackgroundId = DEFAULT_COSMETIC_ID
  /** `default` means no hat. */
  equippedHatId = DEFAULT_COSMETIC_ID
  /** `default` means no trail. */
  equippedTrailId = DEFAULT_COSMETIC_ID
  private persist: boolean

  constructor(persist = true) {
    this.persist = persist
    if (this.persist) this.load()
  }

  isSlingshotOwned(id: string): boolean {
    return this.slingshotUnlocked.has(id)
  }

  isHatOwned(id: string): boolean {
    return this.hatUnlocked.has(id)
  }

  isTrailOwned(id: string): boolean {
    return this.trailUnlocked.has(id)
  }

  get ownedHatIds(): ReadonlySet<string> {
    return this.hatUnlocked
  }

  get ownedTrailIds(): ReadonlySet<string> {
    return this.trailUnlocked
  }

  get ownedHatCount(): number {
    return this.hatUnlocked.size
  }

  get ownedTrailCount(): number {
    return this.trailUnlocked.size
  }

  grantHat(id: string): boolean {
    if (!findHatVariant(id) || this.hatUnlocked.has(id)) return false
    this.hatUnlocked.add(id)
    this.equippedHatId = id
    if (this.persist) {
      this.saveHatUnlocks()
      this.saveEquipped()
    }
    return true
  }

  grantTrail(id: string): boolean {
    if (!findTrailVariant(id) || this.trailUnlocked.has(id)) return false
    this.trailUnlocked.add(id)
    this.equippedTrailId = id
    if (this.persist) {
      this.saveTrailUnlocks()
      this.saveEquipped()
    }
    return true
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
    const allIds = [DEFAULT_COSMETIC_ID, ...VISIBLE_BALL_VARIANTS.map((v) => v.id)]
    const current = allIds.indexOf(this.equippedBallId)
    const next =
      current >= 0
        ? allIds[(current + delta + allIds.length) % allIds.length]!
        : DEFAULT_COSMETIC_ID
    this.equippedBallId = next
    this.saveEquipped()
  }

  cycleBackgroundMenu(delta: number): void {
    const allIds = [DEFAULT_COSMETIC_ID, ...BACKGROUND_VARIANTS.map((v) => v.id)]
    const current = allIds.indexOf(this.equippedBackgroundId)
    const next =
      current >= 0
        ? allIds[(current + delta + allIds.length) % allIds.length]!
        : DEFAULT_COSMETIC_ID
    this.equippedBackgroundId = next
    this.saveEquipped()
  }

  /** Cycle None + owned hats only (for equip UI). */
  cycleHatMenu(delta: number): void {
    const allIds = [
      DEFAULT_COSMETIC_ID,
      ...HAT_VARIANTS.filter((v) => this.hatUnlocked.has(v.id)).map((v) => v.id),
    ]
    const current = allIds.indexOf(this.equippedHatId)
    const next =
      current >= 0
        ? allIds[(current + delta + allIds.length) % allIds.length]!
        : DEFAULT_COSMETIC_ID
    this.equippedHatId = next
    this.saveEquipped()
  }

  /** Cycle None + owned trails only. */
  cycleTrailMenu(delta: number): void {
    const allIds = [
      DEFAULT_COSMETIC_ID,
      ...TRAIL_VARIANTS.filter((v) => this.trailUnlocked.has(v.id)).map((v) => v.id),
    ]
    const current = allIds.indexOf(this.equippedTrailId)
    const next =
      current >= 0
        ? allIds[(current + delta + allIds.length) % allIds.length]!
        : DEFAULT_COSMETIC_ID
    this.equippedTrailId = next
    this.saveEquipped()
  }

  equipHat(id: string): void {
    if (id === DEFAULT_COSMETIC_ID || this.isHatOwned(id)) {
      this.equippedHatId = id
      this.saveEquipped()
    }
  }

  equipTrail(id: string): void {
    if (id === DEFAULT_COSMETIC_ID || this.isTrailOwned(id)) {
      this.equippedTrailId = id
      this.saveEquipped()
    }
  }

  isBackgroundUnlocked(id: string, bestHeight: number, highScore: number): boolean {
    const variant = findBackgroundVariant(id)
    if (!variant) return false
    return isBackgroundVariantUnlocked(variant, bestHeight, highScore, this.backgroundUnlocked)
  }

  purchaseBackground(id: string, spendCoins: (amount: number) => boolean): boolean {
    const variant = findBackgroundVariant(id)
    if (!variant || variant.unlock.kind !== "coins") return false
    if (this.isBackgroundUnlocked(id, 0, 0)) return false
    if (!spendCoins(variant.unlock.value)) return false
    this.backgroundUnlocked.add(id)
    this.equippedBackgroundId = id
    if (this.persist) {
      this.saveBackgroundUnlocks()
      this.saveEquipped()
    }
    return true
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
    if (id !== DEFAULT_COSMETIC_ID && !isBallVariantVisible(id)) return
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
    if (!isBallVariantVisible(this.equippedBallId)) return "classic"
    if (!this.isBallUnlocked(this.equippedBallId, bestHeight, highScore)) return "classic"
    return findBallVariant(this.equippedBallId)?.style ?? "classic"
  }

  /** Active background for gameplay (unlocked variants only). */
  getEquippedBackgroundStyle(bestHeight: number, highScore: number): BackgroundStyle {
    if (this.equippedBackgroundId === DEFAULT_COSMETIC_ID) return "classic"
    if (!this.isBackgroundUnlocked(this.equippedBackgroundId, bestHeight, highScore)) {
      return "classic"
    }
    return findBackgroundVariant(this.equippedBackgroundId)?.style ?? "classic"
  }

  /** Active hat for gameplay (owned only). */
  getEquippedHatStyle(): HatStyle {
    if (this.equippedHatId === DEFAULT_COSMETIC_ID) return "none"
    if (!this.isHatOwned(this.equippedHatId)) return "none"
    return findHatVariant(this.equippedHatId)?.style ?? "none"
  }

  getSelectedHatStyle(): HatStyle {
    if (this.equippedHatId === DEFAULT_COSMETIC_ID) return "none"
    return findHatVariant(this.equippedHatId)?.style ?? "none"
  }

  getSelectedHatVariant(): HatVariant | null {
    if (this.equippedHatId === DEFAULT_COSMETIC_ID) return null
    return findHatVariant(this.equippedHatId) ?? null
  }

  getSelectedHatName(): string {
    if (this.equippedHatId === DEFAULT_COSMETIC_ID) return "None"
    return findHatVariant(this.equippedHatId)?.name ?? "None"
  }

  getEquippedTrailStyle(): TrailStyle {
    if (this.equippedTrailId === DEFAULT_COSMETIC_ID) return "none"
    if (!this.isTrailOwned(this.equippedTrailId)) return "none"
    return findTrailVariant(this.equippedTrailId)?.style ?? "none"
  }

  getSelectedTrailStyle(): TrailStyle {
    if (this.equippedTrailId === DEFAULT_COSMETIC_ID) return "none"
    return findTrailVariant(this.equippedTrailId)?.style ?? "none"
  }

  getSelectedTrailName(): string {
    if (this.equippedTrailId === DEFAULT_COSMETIC_ID) return "None"
    return findTrailVariant(this.equippedTrailId)?.name ?? "None"
  }

  getSelectedBackgroundStyle(): BackgroundStyle {
    if (this.equippedBackgroundId === DEFAULT_COSMETIC_ID) return "classic"
    return findBackgroundVariant(this.equippedBackgroundId)?.style ?? "classic"
  }

  getSelectedBackgroundUnlockHint(): string | null {
    if (this.equippedBackgroundId === DEFAULT_COSMETIC_ID) return null
    const variant = findBackgroundVariant(this.equippedBackgroundId)
    if (!variant) return null
    return backgroundUnlockHint(variant)
  }

  isBackgroundSelectionLocked(bestHeight: number, highScore: number): boolean {
    return (
      this.equippedBackgroundId !== DEFAULT_COSMETIC_ID &&
      !this.isBackgroundUnlocked(this.equippedBackgroundId, bestHeight, highScore)
    )
  }

  previewBackgroundPrice(): number | null {
    if (this.equippedBackgroundId === DEFAULT_COSMETIC_ID) return null
    const variant = findBackgroundVariant(this.equippedBackgroundId)
    if (!variant || variant.unlock.kind !== "coins") return null
    if (this.isBackgroundUnlocked(variant.id, 0, 0)) return null
    return variant.unlock.value
  }

  getSelectedSlingshotStyle(): SlingshotStyle {
    if (this.equippedSlingshotId === DEFAULT_COSMETIC_ID) return "classic"
    return findSlingshotVariant(this.equippedSlingshotId)?.style ?? "classic"
  }

  getSelectedBallStyle(): BallStyle {
    if (this.equippedBallId === DEFAULT_COSMETIC_ID) return "classic"
    if (!isBallVariantVisible(this.equippedBallId)) return "classic"
    return findBallVariant(this.equippedBallId)?.style ?? "classic"
  }

  getSelectedBallVariant(): BallVariant | null {
    if (this.equippedBallId === DEFAULT_COSMETIC_ID) return null
    if (!isBallVariantVisible(this.equippedBallId)) return null
    return findBallVariant(this.equippedBallId) ?? null
  }

  /** Short label for a locked ball's unlock requirement. */
  getSelectedBallUnlockHint(): string | null {
    const variant = this.getSelectedBallVariant()
    if (!variant) return null
    return ballUnlockHint(variant)
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
      isBallVariantVisible(this.equippedBallId) &&
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
    if (!isBallVariantVisible(this.equippedBallId)) {
      this.equippedBallId = DEFAULT_COSMETIC_ID
    }
    this.equippedBackgroundId =
      this.loadString(EQUIPPED_BACKGROUND_KEY) ?? DEFAULT_COSMETIC_ID
    this.equippedHatId = this.loadString(EQUIPPED_HAT_KEY) ?? DEFAULT_COSMETIC_ID
    this.equippedTrailId = this.loadString(EQUIPPED_TRAIL_KEY) ?? DEFAULT_COSMETIC_ID

    try {
      const raw = localStorage.getItem(BACKGROUND_UNLOCKS_KEY)
      if (raw) {
        const ids = JSON.parse(raw) as string[]
        if (Array.isArray(ids)) {
          for (const id of ids) {
            if (BACKGROUND_VARIANTS.some((v) => v.id === id)) {
              this.backgroundUnlocked.add(id)
            }
          }
        }
      }
    } catch {
      // ignore
    }

    try {
      const raw = localStorage.getItem(HAT_UNLOCKS_KEY)
      if (raw) {
        const ids = JSON.parse(raw) as string[]
        if (Array.isArray(ids)) {
          for (const id of ids) {
            if (HAT_VARIANTS.some((v) => v.id === id)) {
              this.hatUnlocked.add(id)
            }
          }
        }
      }
    } catch {
      // ignore
    }

    try {
      const raw = localStorage.getItem(TRAIL_UNLOCKS_KEY)
      if (raw) {
        const ids = JSON.parse(raw) as string[]
        if (Array.isArray(ids)) {
          for (const id of ids) {
            if (TRAIL_VARIANTS.some((v) => v.id === id)) {
              this.trailUnlocked.add(id)
            }
          }
        }
      }
    } catch {
      // ignore
    }

    if (
      this.equippedHatId !== DEFAULT_COSMETIC_ID &&
      !this.hatUnlocked.has(this.equippedHatId)
    ) {
      this.equippedHatId = DEFAULT_COSMETIC_ID
    }
    if (
      this.equippedTrailId !== DEFAULT_COSMETIC_ID &&
      !this.trailUnlocked.has(this.equippedTrailId)
    ) {
      this.equippedTrailId = DEFAULT_COSMETIC_ID
    }
  }

  private saveBackgroundUnlocks(): void {
    try {
      localStorage.setItem(
        BACKGROUND_UNLOCKS_KEY,
        JSON.stringify([...this.backgroundUnlocked]),
      )
    } catch {
      // ignore
    }
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

  private saveHatUnlocks(): void {
    try {
      localStorage.setItem(HAT_UNLOCKS_KEY, JSON.stringify([...this.hatUnlocked]))
    } catch {
      // ignore
    }
  }

  private saveTrailUnlocks(): void {
    try {
      localStorage.setItem(TRAIL_UNLOCKS_KEY, JSON.stringify([...this.trailUnlocked]))
    } catch {
      // ignore
    }
  }

  private saveEquipped(): void {
    if (!this.persist) return
    try {
      localStorage.setItem(EQUIPPED_SLINGSHOT_KEY, this.equippedSlingshotId)
      localStorage.setItem(EQUIPPED_BALL_KEY, this.equippedBallId)
      localStorage.setItem(EQUIPPED_BACKGROUND_KEY, this.equippedBackgroundId)
      localStorage.setItem(EQUIPPED_HAT_KEY, this.equippedHatId)
      localStorage.setItem(EQUIPPED_TRAIL_KEY, this.equippedTrailId)
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
