/** Shared rarity for hats, trails, balls, and gacha reveal UI. */

export type CosmeticRarity = "common" | "uncommon" | "rare" | "epic" | "legendary"

export const RARITY_LABEL: Record<CosmeticRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
}

/** Common is cream. On a cream panel use `rarityLabelColor` so the label stays ink. */
export const RARITY_COLOR: Record<CosmeticRarity, string> = {
  common: "#FFF1D6",
  uncommon: "#4FAE5A",
  rare: "#2BB3A3",
  epic: "#8C4BD8",
  legendary: "#FFB547",
}

const COMMON_ON_LIGHT = "#2B1B17"

/** Rarity colour that stays readable on a light panel. */
export function rarityLabelColor(rarity: CosmeticRarity, onLight: boolean): string {
  if (onLight && rarity === "common") return COMMON_ON_LIGHT
  return RARITY_COLOR[rarity]
}

/** Soft glow / orb fill behind rarity-colored seals. */
export const RARITY_GLOW: Record<CosmeticRarity, string> = {
  common: "rgba(255, 241, 214, 0.45)",
  uncommon: "rgba(79, 174, 90, 0.4)",
  rare: "rgba(43, 179, 163, 0.45)",
  epic: "rgba(140, 75, 216, 0.5)",
  legendary: "rgba(255, 181, 71, 0.5)",
}

/** Coin refund when a gacha pull duplicates an owned cosmetic. Legendary is display-only. */
export const DUPLICATE_REFUND: Record<CosmeticRarity, number> = {
  common: 2,
  uncommon: 4,
  rare: 8,
  epic: 15,
  legendary: 0,
}
