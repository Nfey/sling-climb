import { skyZoneColor } from "../constants"

/**
 * Home Turf palette for Sunbaked Canyon (Canyon Floor, climb 0–2000).
 * Stage 2 reads these stops for the sky table and backdrop. Stage 1 only
 * publishes them: the live sky is still the existing band colours.
 */
export const SUNBAKED_CANYON = {
  zone: "Canyon Floor",
  climbStart: 0,
  climbEnd: 2000,
  blendInto: "Mesa Tops",
  ink: "#2B1B17",
  cream: "#FFF1D6",
  headbandRed: "#E8443A",
  /** Canyon Floor sky stops (top → horizon). */
  skyStops: ["#F7A08A", "#FFC9A6", "#FFE0B5"] as const,
  /** Mesa Tops contrast stops, blended in from climb 2000. */
  mesaTopsStops: ["#FFB06A", "#FFD394", "#FFF0CC"] as const,
} as const

/** PWA / browser chrome sampled from the Canyon Floor sky stops. */
export const THEME_COLOR = SUNBAKED_CANYON.skyStops[0]
export const BACKGROUND_COLOR = SUNBAKED_CANYON.skyStops[2]

/**
 * Orbit + Deep Space begin here. Night-rim layers and crumbling-night
 * stone switch on at this climb (world Y − run start).
 */
export const NIGHT_RIM_CLIMB = 40_000

/**
 * Sky colour for a climb height. Stage 2 replaces the body with the
 * 7-zone × 3-stop table. Stage 1 keeps today's repeating sky bands.
 */
export function skyColorForClimb(climb: number): string {
  return skyZoneColor(climb)
}

/** True when a theme's ink reads as a light colour (dark background). */
export function inkIsLight(ink: string): boolean {
  const match = /^#([0-9a-f]{6})$/i.exec(ink.trim())
  if (!match) return false
  const hex = Number.parseInt(match[1]!, 16)
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const lin = (channel: number) => {
    const s = channel / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return luminance > 0.6
}
