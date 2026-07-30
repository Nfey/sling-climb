export interface SlingshotSkin {
  body: string
  band: string
  accent: string
}

export interface BallSkin {
  highlight: string
  fill: string
  stroke: string
  strokeAlpha: string
}

export interface SlingshotVariant {
  id: string
  name: string
  price: number
  skin: SlingshotSkin
}

export interface BallVariant {
  id: string
  name: string
  unlockHeight: number
  skin: BallSkin
}

/** Default look used before any slingshot variant is purchased. */
export const DEFAULT_SLINGSHOT_SKIN: SlingshotSkin = {
  body: "#2f6fed",
  band: "#1d4fbf",
  accent: "#2f6fed",
}

/** Default look used before any ball variant is unlocked. */
export const DEFAULT_BALL_SKIN: BallSkin = {
  highlight: "#fff6dd",
  fill: "#f0d9a0",
  stroke: "#d4b06a",
  strokeAlpha: "rgba(90, 60, 30, 0.25)",
}

export const SLINGSHOT_VARIANTS: readonly SlingshotVariant[] = [
  {
    id: "wood",
    name: "Wood",
    price: 5,
    skin: { body: "#8b5a2b", band: "#5c3d1e", accent: "#a0622a" },
  },
  {
    id: "iron",
    name: "Iron",
    price: 10,
    skin: { body: "#64748b", band: "#334155", accent: "#94a3b8" },
  },
  {
    id: "forest",
    name: "Forest",
    price: 15,
    skin: { body: "#15803d", band: "#14532d", accent: "#22c55e" },
  },
  {
    id: "royal",
    name: "Royal",
    price: 20,
    skin: { body: "#7c3aed", band: "#5b21b6", accent: "#a78bfa" },
  },
  {
    id: "crimson",
    name: "Crimson",
    price: 25,
    skin: { body: "#dc2626", band: "#991b1b", accent: "#f87171" },
  },
  {
    id: "golden",
    name: "Golden",
    price: 50,
    skin: { body: "#ca8a04", band: "#854d0e", accent: "#facc15" },
  },
  {
    id: "diamond",
    name: "Diamond",
    price: 100,
    skin: { body: "#67e8f9", band: "#0891b2", accent: "#e0f2fe" },
  },
]

export const BALL_VARIANTS: readonly BallVariant[] = [
  {
    id: "ruby",
    name: "Ruby",
    unlockHeight: 5000,
    skin: {
      highlight: "#ffe4e6",
      fill: "#fb7185",
      stroke: "#be123c",
      strokeAlpha: "rgba(190, 18, 60, 0.35)",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    unlockHeight: 10000,
    skin: {
      highlight: "#ecfdf5",
      fill: "#34d399",
      stroke: "#047857",
      strokeAlpha: "rgba(4, 120, 87, 0.35)",
    },
  },
  {
    id: "sapphire",
    name: "Sapphire",
    unlockHeight: 15000,
    skin: {
      highlight: "#eff6ff",
      fill: "#60a5fa",
      stroke: "#1d4ed8",
      strokeAlpha: "rgba(29, 78, 216, 0.35)",
    },
  },
  {
    id: "amethyst",
    name: "Amethyst",
    unlockHeight: 20000,
    skin: {
      highlight: "#f5f3ff",
      fill: "#a78bfa",
      stroke: "#6d28d9",
      strokeAlpha: "rgba(109, 40, 217, 0.35)",
    },
  },
  {
    id: "topaz",
    name: "Topaz",
    unlockHeight: 25000,
    skin: {
      highlight: "#fffbeb",
      fill: "#fbbf24",
      stroke: "#b45309",
      strokeAlpha: "rgba(180, 83, 9, 0.35)",
    },
  },
  {
    id: "obsidian",
    name: "Obsidian",
    unlockHeight: 50000,
    skin: {
      highlight: "#475569",
      fill: "#1e293b",
      stroke: "#0f172a",
      strokeAlpha: "rgba(15, 23, 42, 0.45)",
    },
  },
  {
    id: "diamond",
    name: "Diamond",
    unlockHeight: 100000,
    skin: {
      highlight: "#ffffff",
      fill: "#bae6fd",
      stroke: "#0284c7",
      strokeAlpha: "rgba(2, 132, 199, 0.35)",
    },
  },
]

export const SLINGSHOT_UNLOCKS_KEY = "sling-climb-slingshot-unlocks"
export const EQUIPPED_SLINGSHOT_KEY = "sling-climb-equipped-slingshot"
export const EQUIPPED_BALL_KEY = "sling-climb-equipped-ball"

/** Sentinel id for the built-in default look (always available). */
export const DEFAULT_COSMETIC_ID = "default"

export class CosmeticsStore {
  /** Purchased slingshot variant ids. */
  private slingshotUnlocked = new Set<string>()
  /** Preview / equipped slingshot id, or DEFAULT_COSMETIC_ID. */
  equippedSlingshotId = DEFAULT_COSMETIC_ID
  /** Preview / equipped ball id, or DEFAULT_COSMETIC_ID. */
  equippedBallId = DEFAULT_COSMETIC_ID
  private persist: boolean

  constructor(persist = true) {
    this.persist = persist
    if (this.persist) this.load()
  }

  /** Index into SLINGSHOT_VARIANTS for the currently previewed slingshot. */
  get slingshotPreviewIndex(): number {
    if (this.equippedSlingshotId === DEFAULT_COSMETIC_ID) return -1
    const idx = SLINGSHOT_VARIANTS.findIndex((v) => v.id === this.equippedSlingshotId)
    return idx >= 0 ? idx : -1
  }

  /** Index into BALL_VARIANTS for the currently previewed ball. */
  get ballPreviewIndex(): number {
    if (this.equippedBallId === DEFAULT_COSMETIC_ID) return -1
    const idx = BALL_VARIANTS.findIndex((v) => v.id === this.equippedBallId)
    return idx >= 0 ? idx : -1
  }

  isSlingshotOwned(id: string): boolean {
    return this.slingshotUnlocked.has(id)
  }

  isBallUnlocked(id: string, bestHeight: number): boolean {
    const variant = BALL_VARIANTS.find((v) => v.id === id)
    if (!variant) return false
    return bestHeight >= variant.unlockHeight
  }

  /** All ball variants the player has earned by height. */
  unlockedBallVariants(bestHeight: number): BallVariant[] {
    return BALL_VARIANTS.filter((v) => bestHeight >= v.unlockHeight)
  }

  /** Cycle slingshot selector through default + all shop variants. */
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

  /** Cycle ball selector through default + all height variants. */
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
    const variant = SLINGSHOT_VARIANTS.find((v) => v.id === id)
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

  getSlingshotSkin(): SlingshotSkin {
    if (
      this.equippedSlingshotId !== DEFAULT_COSMETIC_ID &&
      !this.isSlingshotOwned(this.equippedSlingshotId)
    ) {
      return DEFAULT_SLINGSHOT_SKIN
    }
    if (this.equippedSlingshotId === DEFAULT_COSMETIC_ID) return DEFAULT_SLINGSHOT_SKIN
    const variant = SLINGSHOT_VARIANTS.find((v) => v.id === this.equippedSlingshotId)
    return variant?.skin ?? DEFAULT_SLINGSHOT_SKIN
  }

  getBallSkin(bestHeight: number): BallSkin {
    if (
      this.equippedBallId !== DEFAULT_COSMETIC_ID &&
      !this.isBallUnlocked(this.equippedBallId, bestHeight)
    ) {
      return DEFAULT_BALL_SKIN
    }
    if (this.equippedBallId === DEFAULT_COSMETIC_ID) return DEFAULT_BALL_SKIN
    const variant = BALL_VARIANTS.find((v) => v.id === this.equippedBallId)
    return variant?.skin ?? DEFAULT_BALL_SKIN
  }

  /** Skin shown in the selector icon (includes locked selections). */
  getSelectedSlingshotSkin(): SlingshotSkin {
    if (this.equippedSlingshotId === DEFAULT_COSMETIC_ID) return DEFAULT_SLINGSHOT_SKIN
    const variant = SLINGSHOT_VARIANTS.find((v) => v.id === this.equippedSlingshotId)
    return variant?.skin ?? DEFAULT_SLINGSHOT_SKIN
  }

  getSelectedBallSkin(): BallSkin {
    if (this.equippedBallId === DEFAULT_COSMETIC_ID) return DEFAULT_BALL_SKIN
    const variant = BALL_VARIANTS.find((v) => v.id === this.equippedBallId)
    return variant?.skin ?? DEFAULT_BALL_SKIN
  }

  isSlingshotSelectionLocked(): boolean {
    return (
      this.equippedSlingshotId !== DEFAULT_COSMETIC_ID &&
      !this.isSlingshotOwned(this.equippedSlingshotId)
    )
  }

  isBallSelectionLocked(bestHeight: number): boolean {
    return (
      this.equippedBallId !== DEFAULT_COSMETIC_ID &&
      !this.isBallUnlocked(this.equippedBallId, bestHeight)
    )
  }

  previewSlingshotPrice(): number | null {
    if (this.equippedSlingshotId === DEFAULT_COSMETIC_ID) return null
    const variant = SLINGSHOT_VARIANTS.find((v) => v.id === this.equippedSlingshotId)
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
