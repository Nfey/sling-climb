/**
 * CS-style horizontal case-opening strip: spins then eases onto the won item.
 */

import type { CosmeticRarity } from "./rarity"
import type { GachaPool, GachaPullResult } from "./gacha"
import { HAT_VARIANTS, type HatStyle } from "./hats"
import { TRAIL_VARIANTS, type TrailStyle } from "./trails"

export type RevealPhase = "idle" | "spinning" | "landed"

/** Total spin length before landing (seconds). */
export const REVEAL_SPIN_SEC = 5.2

/** How long the landed highlight holds before auto-dismiss is allowed. */
export const REVEAL_LAND_HOLD_SEC = 0.35

export const STRIP_SLOT_WIDTH = 76
export const STRIP_SLOT_GAP = 8
export const STRIP_SLOT_HEIGHT = 96
export const STRIP_LENGTH = 52
/** Won item index near the end so the strip travels a long way. */
export const STRIP_WON_INDEX = 42

export interface StripSlot {
  id: string
  name: string
  rarity: CosmeticRarity
  pool: GachaPool
  hatStyle: HatStyle | null
  trailStyle: TrailStyle | null
}

export interface GachaRevealState {
  phase: RevealPhase
  /** Seconds in the current phase. */
  elapsed: number
  pool: GachaPool | null
  result: GachaPullResult | null
  /** Horizontal strip of preview icons. */
  strip: StripSlot[]
  /** Index of the awarded item in `strip`. */
  wonIndex: number
  /** Final scroll offset (px) that centers the won slot under the marker. */
  targetScroll: number
  /** Current scroll offset (px). */
  scroll: number
}

export function idleReveal(): GachaRevealState {
  return {
    phase: "idle",
    elapsed: 0,
    pool: null,
    result: null,
    strip: [],
    wonIndex: 0,
    targetScroll: 0,
    scroll: 0,
  }
}

export function beginReveal(
  pool: GachaPool,
  result: GachaPullResult,
  viewCenterX: number,
): GachaRevealState {
  const strip = buildStrip(pool, result)
  const wonIndex = STRIP_WON_INDEX
  const cell = STRIP_SLOT_WIDTH + STRIP_SLOT_GAP
  // Slot centers sit at i * cell + SLOT_WIDTH/2; marker is at viewCenterX.
  const targetScroll =
    wonIndex * cell + STRIP_SLOT_WIDTH / 2 - viewCenterX + randomJitter()
  return {
    phase: "spinning",
    elapsed: 0,
    pool,
    result,
    strip,
    wonIndex,
    targetScroll: Math.max(0, targetScroll),
    scroll: 0,
  }
}

/** Advance spin easing; transitions spinning → landed. */
export function tickReveal(state: GachaRevealState, dt: number): GachaRevealState {
  if (state.phase === "idle") return state
  if (state.phase === "landed") {
    return { ...state, elapsed: state.elapsed + dt }
  }

  const elapsed = state.elapsed + dt
  const t = Math.min(1, elapsed / REVEAL_SPIN_SEC)
  const eased = easeOutQuint(t)
  const scroll = state.targetScroll * eased
  if (t >= 1) {
    return {
      ...state,
      phase: "landed",
      elapsed: 0,
      scroll: state.targetScroll,
    }
  }
  return { ...state, elapsed, scroll }
}

/** Tap while landed dismisses the strip overlay. */
export function tapReveal(state: GachaRevealState): GachaRevealState {
  if (state.phase !== "landed") return state
  if (state.elapsed < REVEAL_LAND_HOLD_SEC) return state
  return idleReveal()
}

export function dismissReveal(state: GachaRevealState): GachaRevealState {
  if (state.phase === "idle") return state
  return idleReveal()
}

export function revealBlocksInput(state: GachaRevealState): boolean {
  return state.phase === "spinning" || state.phase === "landed"
}

export function revealRarity(state: GachaRevealState): CosmeticRarity | null {
  return state.result?.rarity ?? null
}

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

/** Small random offset so the winner isn't always pixel-perfect center (CS feel). */
function randomJitter(): number {
  return (Math.random() - 0.5) * (STRIP_SLOT_WIDTH * 0.35)
}

function buildStrip(pool: GachaPool, result: GachaPullResult): StripSlot[] {
  const strip: StripSlot[] = []
  for (let i = 0; i < STRIP_LENGTH; i++) {
    if (i === STRIP_WON_INDEX) {
      strip.push(slotFromResult(result))
    } else {
      strip.push(randomFiller(pool))
    }
  }
  return strip
}

function slotFromResult(result: GachaPullResult): StripSlot {
  if (result.pool === "hat" && result.hat) {
    return {
      id: result.hat.id,
      name: result.hat.name,
      rarity: result.hat.rarity,
      pool: "hat",
      hatStyle: result.hat.style,
      trailStyle: null,
    }
  }
  if (result.pool === "trail" && result.trail) {
    return {
      id: result.trail.id,
      name: result.trail.name,
      rarity: result.trail.rarity,
      pool: "trail",
      hatStyle: null,
      trailStyle: result.trail.style,
    }
  }
  return {
    id: result.item.id,
    name: result.item.name,
    rarity: result.item.rarity,
    pool: result.pool,
    hatStyle: null,
    trailStyle: null,
  }
}

function randomFiller(pool: GachaPool): StripSlot {
  if (pool === "hat") {
    // Bias toward common/uncommon so rares feel special when they flash by.
    const roll = Math.random()
    let rarity: CosmeticRarity = "common"
    if (roll > 0.97) rarity = "epic"
    else if (roll > 0.88) rarity = "rare"
    else if (roll > 0.55) rarity = "uncommon"
    const poolItems = HAT_VARIANTS.filter((v) => v.rarity === rarity)
    const list = poolItems.length > 0 ? poolItems : [...HAT_VARIANTS]
    const v = list[Math.floor(Math.random() * list.length)]!
    return {
      id: v.id,
      name: v.name,
      rarity: v.rarity,
      pool: "hat",
      hatStyle: v.style,
      trailStyle: null,
    }
  }
  const roll = Math.random()
  let rarity: CosmeticRarity = "common"
  if (roll > 0.97) rarity = "epic"
  else if (roll > 0.88) rarity = "rare"
  else if (roll > 0.55) rarity = "uncommon"
  const poolItems = TRAIL_VARIANTS.filter((v) => v.rarity === rarity)
  const list = poolItems.length > 0 ? poolItems : [...TRAIL_VARIANTS]
  const v = list[Math.floor(Math.random() * list.length)]!
  return {
    id: v.id,
    name: v.name,
    rarity: v.rarity,
    pool: "trail",
    hatStyle: null,
    trailStyle: v.style,
  }
}
