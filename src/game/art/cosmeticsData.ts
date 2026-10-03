import manifestJson from "../../assets/art/cosmetics-manifest.json" with { type: "json" }

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

export interface SlingBand {
  color: string
  core: string
  width_css: number
  accent: string
  pouch: string
  anchor_src: [number, number]
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
  anchor_src?: [number, number]
  band?: { color?: string; core?: string; width_css?: number }
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
  pouch: "character/pouch",
  anchor_src: [256, 472],
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
  }
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
  if (id.startsWith("slings/")) {
    const slingId = id.slice("slings/".length).replace(/_pow$/, "")
    return manifest.slings?.[slingId]?.anchor_src ?? null
  }
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
