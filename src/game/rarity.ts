/** Shared rarity for hats, trails, and gacha reveal UI. */

export type CosmeticRarity = "common" | "uncommon" | "rare" | "epic"

export const RARITY_LABEL: Record<CosmeticRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
}

export const RARITY_COLOR: Record<CosmeticRarity, string> = {
  common: "#64748b",
  uncommon: "#16a34a",
  rare: "#2563eb",
  epic: "#c026d3",
}

/** Soft glow / orb fill behind rarity-colored seals. */
export const RARITY_GLOW: Record<CosmeticRarity, string> = {
  common: "rgba(100, 116, 139, 0.35)",
  uncommon: "rgba(22, 163, 74, 0.4)",
  rare: "rgba(37, 99, 235, 0.45)",
  epic: "rgba(192, 38, 211, 0.5)",
}

/** Coin refund when a gacha pull duplicates an owned cosmetic. */
export const DUPLICATE_REFUND: Record<CosmeticRarity, number> = {
  common: 2,
  uncommon: 4,
  rare: 8,
  epic: 15,
}
