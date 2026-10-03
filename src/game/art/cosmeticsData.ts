import manifestJson from "../../assets/art/cosmetics-manifest.json" with { type: "json" }
import type { CosmeticRarity } from "../rarity"

/**
 * Runtime view of `cosmetics-manifest.json`. Later art batches add files and
 * entries; missing sprites fall back to procedural drawing.
 */

export interface HatPart {
  id: string
  anchor_src: [number, number]
  at_src: [number, number]
  spin_rad_s: number
}

export interface HatPulse {
  alpha: [number, number]
  hz: number
}

export interface HatPlacement {
  anchor_src: [number, number]
  seat_r: [number, number]
  scale: number
  tilt_deg: number
  layer: "front" | "split"
  follow_spin: boolean
  follow_squash: boolean
  parts: HatPart[]
  pulse: HatPulse | null
  frames: number
  fps: number
  hides_headband: boolean
  /** Stage-1 headband anchor is the ball centre, not the brim line. */
  legacy_center: boolean
  sprite: string | null
}

export interface BallSkin {
  face_knock: string | null
  blush: string
  blush_alpha: number
  light: string | null
  static_layer: string | null
  face_offset_r: [number, number]
}

export interface SlingBandPattern {
  dash_css: number[]
  core_width_css: number
}

export interface SlingBand {
  color: string
  core: string
  width_css: number
  accent: string
  pouch: string
  anchor_src: [number, number]
  pattern: SlingBandPattern | null
}

export type SlingUnlock =
  | { kind: "default" }
  | { kind: "coins"; price: number }
  | { kind: "climbed"; value: number }
  | { kind: "height"; value: number }

export interface SlingCatalogEntry {
  id: string
  name: string
  rarity: CosmeticRarity | null
  unlock: SlingUnlock
  fallbackUnlock?: { kind: "height"; value: number }
}

export interface TrailStamp {
  sprite: string
  frames: number
  fps: number
}

interface ManifestHat extends Partial<HatPlacement> {
  parts?: HatPart[]
  pulse?: HatPulse | null
}

interface ManifestBall {
  face_knock?: string | null
  blush?: string
  blush_alpha?: number
  light?: string | null
  static_layer?: string | null
  face_offset_r?: [number, number]
}

interface ManifestSling {
  name?: string
  rarity?: string | null
  unlock?: { kind?: string; price?: number; value?: number }
  fallback_unlock?: { kind?: string; value?: number }
  anchor_src?: [number, number]
  band?: {
    color?: string
    core?: string
    width_css?: number
    pattern?: { dash_css?: number[]; core_width_css?: number } | null
  }
  accent?: string
  pouch?: string
}

interface ManifestTrail {
  sprite?: string
  frames?: number
  fps?: number
}

const manifest = manifestJson as unknown as {
  hats?: Record<string, ManifestHat>
  balls?: Record<string, ManifestBall>
  slings?: Record<string, ManifestSling>
  trails?: Record<string, ManifestTrail>
}

const HAT_DEFAULT: HatPlacement = {
  anchor_src: [192, 288],
  seat_r: [0, -0.55],
  scale: 1,
  tilt_deg: 0,
  layer: "front",
  follow_spin: false,
  follow_squash: true,
  parts: [],
  pulse: null,
  frames: 1,
  fps: 0,
  hides_headband: true,
  legacy_center: false,
  sprite: null,
}

const BALL_DEFAULT: BallSkin = {
  face_knock: null,
  blush: "#FF8E5E",
  blush_alpha: 1,
  light: "balls/_light",
  static_layer: null,
  face_offset_r: [0, 0],
}

const SLING_DEFAULT: SlingBand = {
  color: "#8E3A22",
  core: "#E8443A",
  width_css: 3.5,
  accent: "#E8443A",
  pouch: "slings/pouch_classic",
  anchor_src: [256, 472],
  pattern: null,
}

export function hatPlacement(id: string): HatPlacement {
  const raw = manifest.hats?.[id]
  if (!raw) return HAT_DEFAULT
  return {
    ...HAT_DEFAULT,
    ...raw,
    parts: raw.parts ?? [],
    pulse: raw.pulse ?? null,
    sprite: raw.sprite ?? null,
  }
}

export function ballSkin(id: string): BallSkin {
  const raw = manifest.balls?.[id]
  if (!raw) return BALL_DEFAULT
  return {
    face_knock: raw.face_knock ?? null,
    blush: raw.blush ?? BALL_DEFAULT.blush,
    blush_alpha: raw.blush_alpha ?? BALL_DEFAULT.blush_alpha,
    light: raw.light === undefined ? BALL_DEFAULT.light : raw.light,
    static_layer: raw.static_layer ?? null,
    face_offset_r: raw.face_offset_r ?? [0, 0],
  }
}

function slingPattern(raw: ManifestSling["band"]): SlingBandPattern | null {
  const pattern = raw?.pattern
  const dash = pattern?.dash_css
  if (!dash || dash.length < 2) return null
  return {
    dash_css: dash,
    core_width_css: pattern?.core_width_css ?? 1.2,
  }
}

function slingUnlock(raw: ManifestSling["unlock"]): SlingUnlock {
  if (raw?.kind === "coins" && raw.price != null) return { kind: "coins", price: raw.price }
  if (raw?.kind === "climbed" && raw.value != null) return { kind: "climbed", value: raw.value }
  if (raw?.kind === "height" && raw.value != null) return { kind: "height", value: raw.value }
  return { kind: "default" }
}

export function slingBand(id: string): SlingBand {
  const raw = manifest.slings?.[id]
  if (!raw) return SLING_DEFAULT
  return {
    color: raw.band?.color ?? SLING_DEFAULT.color,
    core: raw.band?.core ?? SLING_DEFAULT.core,
    width_css: raw.band?.width_css ?? SLING_DEFAULT.width_css,
    accent: raw.accent ?? SLING_DEFAULT.accent,
    pouch: raw.pouch ?? SLING_DEFAULT.pouch,
    anchor_src: raw.anchor_src ?? SLING_DEFAULT.anchor_src,
    pattern: slingPattern(raw.band),
  }
}

const RARITIES = new Set(["common", "uncommon", "rare", "epic", "legendary"])

/** Manifest order. Classic is the free default; the rest are shop slings. */
export function slingCatalog(): SlingCatalogEntry[] {
  const slings = manifest.slings ?? {}
  return Object.entries(slings).map(([id, raw]) => {
    const fallback = raw.fallback_unlock
    const rarity = raw.rarity && RARITIES.has(raw.rarity) ? (raw.rarity as CosmeticRarity) : null
    return {
      id,
      name: raw.name ?? id,
      rarity,
      unlock: slingUnlock(raw.unlock),
      fallbackUnlock:
        fallback?.kind === "height" && fallback.value != null
          ? { kind: "height" as const, value: fallback.value }
          : undefined,
    }
  })
}

export function trailStamp(id: string): TrailStamp {
  const raw = manifest.trails?.[id]
  return {
    sprite: raw?.sprite ?? `trails/${id}`,
    frames: raw?.frames ?? 1,
    fps: raw?.fps ?? 0,
  }
}

/** Explicit source-px anchor when the manifest has one. Null → loader default. */
export function explicitAnchor(id: string): [number, number] | null {
  if (id.startsWith("hats/")) {
    const hatId = id.slice("hats/".length).replace(/_(back|blade)$/, "")
    const raw = manifest.hats?.[hatId]
    if (id.endsWith("_blade")) {
      const part = raw?.parts?.find((p) => p.id === id)
      return part?.anchor_src ?? null
    }
    return raw?.anchor_src ?? null
  }
  if (id.startsWith("slings/pouch_")) return [64, 48]
  if (id.startsWith("slings/")) {
    const slingId = id.slice("slings/".length).replace(/_pow$/, "")
    return manifest.slings?.[slingId]?.anchor_src ?? [256, 472]
  }
  // Static layers are 448² source px. (224, 224) is the ball centre.
  if (id.endsWith("_static")) return [224, 224]
  return null
}

export function explicitFrames(id: string): { frames: number; fps: number } | null {
  if (!id.startsWith("hats/")) return null
  const hatId = id.slice("hats/".length).replace(/_back$/, "")
  const raw = manifest.hats?.[hatId]
  if (!raw || id.endsWith("_back") || id.endsWith("_blade")) return null
  if (!raw.frames || raw.frames < 2) return null
  return { frames: raw.frames, fps: raw.fps ?? 0 }
}
