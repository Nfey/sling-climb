/**
 * Tap-to-reveal gacha presentation: charge → sealed (rarity color) → open → shown.
 */

import type { CosmeticRarity } from "./rarity"
import type { GachaPool, GachaPullResult } from "./gacha"

export type RevealPhase = "idle" | "charging" | "sealed" | "opening" | "shown"

export const REVEAL_CHARGE_SEC = 0.75
export const REVEAL_OPEN_SEC = 0.55

export interface GachaRevealState {
  phase: RevealPhase
  /** Seconds in the current phase. */
  elapsed: number
  pool: GachaPool | null
  result: GachaPullResult | null
}

export function idleReveal(): GachaRevealState {
  return { phase: "idle", elapsed: 0, pool: null, result: null }
}

export function beginReveal(
  pool: GachaPool,
  result: GachaPullResult,
): GachaRevealState {
  return { phase: "charging", elapsed: 0, pool, result }
}

/** Advance timers; auto-transitions charging → sealed and opening → shown. */
export function tickReveal(state: GachaRevealState, dt: number): GachaRevealState {
  if (state.phase === "idle" || state.phase === "sealed" || state.phase === "shown") {
    return state
  }
  const elapsed = state.elapsed + dt
  if (state.phase === "charging" && elapsed >= REVEAL_CHARGE_SEC) {
    return { ...state, phase: "sealed", elapsed: 0 }
  }
  if (state.phase === "opening" && elapsed >= REVEAL_OPEN_SEC) {
    return { ...state, phase: "shown", elapsed: 0 }
  }
  return { ...state, elapsed }
}

/** Player tap during sealed → opening. Returns true if handled. */
export function tapReveal(state: GachaRevealState): GachaRevealState {
  if (state.phase !== "sealed" || !state.result) return state
  return { ...state, phase: "opening", elapsed: 0 }
}

export function dismissReveal(state: GachaRevealState): GachaRevealState {
  if (state.phase === "idle") return state
  return idleReveal()
}

export function revealBlocksInput(state: GachaRevealState): boolean {
  return (
    state.phase === "charging" ||
    state.phase === "sealed" ||
    state.phase === "opening"
  )
}

export function revealRarity(state: GachaRevealState): CosmeticRarity | null {
  return state.result?.rarity ?? null
}
