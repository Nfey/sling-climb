export type BackgroundStyle =
  | "classic"
  | "sky"
  | "space"
  | "rain"
  | "cute"
  | "emo"
  | "anime"
  | "grunge"
  | "sunset"
  | "neon"
  | "aurora"

export type BackgroundUnlockKind = "height" | "points" | "coins"

export interface BackgroundUnlock {
  kind: BackgroundUnlockKind
  value: number
}

export interface BackgroundVariant {
  id: string
  name: string
  style: BackgroundStyle
  unlock: BackgroundUnlock
}

/** Unlockable environment themes (classic is always free). */
export const BACKGROUND_VARIANTS: readonly BackgroundVariant[] = [
  { id: "sky", name: "Sky", style: "sky", unlock: { kind: "points", value: 2_500 } },
  { id: "space", name: "Space", style: "space", unlock: { kind: "height", value: 2_500 } },
  { id: "rain", name: "Rain", style: "rain", unlock: { kind: "points", value: 5_000 } },
  { id: "cute", name: "Cute", style: "cute", unlock: { kind: "coins", value: 15 } },
  { id: "emo", name: "Emo", style: "emo", unlock: { kind: "points", value: 10_000 } },
  { id: "anime", name: "Anime", style: "anime", unlock: { kind: "height", value: 7_500 } },
  { id: "grunge", name: "Grunge", style: "grunge", unlock: { kind: "points", value: 15_000 } },
  { id: "sunset", name: "Sunset", style: "sunset", unlock: { kind: "height", value: 12_500 } },
  { id: "neon", name: "Neon", style: "neon", unlock: { kind: "coins", value: 30 } },
  { id: "aurora", name: "Aurora", style: "aurora", unlock: { kind: "height", value: 50_000 } },
]

export const BACKGROUND_UNLOCKS_KEY = "sling-climb-background-unlocks"
export const EQUIPPED_BACKGROUND_KEY = "sling-climb-equipped-background"

export function findBackgroundVariant(id: string): BackgroundVariant | undefined {
  return BACKGROUND_VARIANTS.find((v) => v.id === id)
}

export function backgroundUnlockHint(variant: BackgroundVariant): string {
  const label = formatUnlockThreshold(variant.unlock.value)
  switch (variant.unlock.kind) {
    case "points":
      return `${label} score`
    case "height":
      return `${label} height`
    case "coins":
      return `${label} coins`
  }
}

function formatUnlockThreshold(value: number): string {
  if (value >= 1000) {
    const k = value / 1000
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`
  }
  return String(Math.round(value))
}

export function isBackgroundVariantUnlocked(
  variant: BackgroundVariant,
  bestHeight: number,
  highScore: number,
  ownedIds: ReadonlySet<string>,
): boolean {
  switch (variant.unlock.kind) {
    case "height":
      return bestHeight >= variant.unlock.value
    case "points":
      return highScore >= variant.unlock.value
    case "coins":
      return ownedIds.has(variant.id)
  }
}
