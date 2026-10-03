import type { Camera } from "../Camera"
import type { PortalData, WallTurretData } from "../types"
import { drawSprite, getSprite, tintedSprite } from "./sprites"
import bgManifestJson from "../../assets/art/ship-bg-manifest.json" with { type: "json" }

/**
 * Sunbaked Canyon stage-2 backdrop. Render-only: the playfield stays
 * x = 0 … camera.width (walls option a). Wall bodies are drawn outward
 * into the letterbox gutter; pillar bumps may cross the bounce line by
 * at most `max_intrusion_css` (4).
 *
 * Files are the shipped @2x tiles. Nothing here decodes a @3x master.
 */

interface SkyZone {
  zone: string
  range: [number, number | null]
  top: string
  mid: string
  bottom: string
  night: boolean
}

interface BgSprite {
  css: [number, number]
  anchor_px3: [number, number]
  inner_edge_x_css?: number
  tile_period_css?: number
}

interface BgManifest {
  sky_table: {
    zone_blend_half_width: number
    night_switch_climb: number
    zones: SkyZone[]
  }
  walls: {
    tile_period_css: number
    alignment: { max_intrusion_limit_css: number }
    zone_wall: Record<string, string>
    night_rim: { file: string; from_climb: number }
  }
  sprites: Record<string, BgSprite>
}

const bg = bgManifestJson as unknown as BgManifest

const NIGHT_WALL = "walls/wall_night_tile"
const NIGHT_RIM = bg.walls.night_rim.file
const WALL_PERIOD = bg.walls.tile_period_css
const MAX_INTRUSION = bg.walls.alignment.max_intrusion_limit_css
const SKY_BLEND = bg.sky_table.zone_blend_half_width
const NIGHT_CLIMB = bg.sky_table.night_switch_climb

/** Wall-body fills from the sprite notes (mount plates use these). */
const WALL_BODY: Record<string, [number, number, number]> = {
  "walls/wall_rock_tile": [0xb4, 0x51, 0x2f],
  "walls/wall_cloud_tile": [0xf6, 0xfa, 0xfe],
  "walls/wall_storm_tile": [0x78, 0x70, 0x9c],
  "walls/wall_strato_tile": [0x97, 0x69, 0x91],
  "walls/wall_night_tile": [0x5a, 0x2a, 0x3a],
}

const PROP_IDS = [
  "props/canyon_cactus-ledge",
  "props/canyon_ledge-a",
  "props/canyon_ledge-b",
  "props/canyon_outcrop",
  "props/canyon_scrub-ledge",
  "props/canyon_spire",
] as const

const MID_ID = "bg/canyon_mid_tile"
const FAR_ID = "bg/canyon_far-key"
const HAZE_ID = "bg/canyon_haze-band"
const BLEND_ID = "bg/canyon-to-mesa_blend"
const DUST_TINT = "#FFF1D6"
const DUST_COUNT = 8

export interface CanyonScenery {
  portals: readonly PortalData[]
  turrets: readonly WallTurretData[]
}

interface Rgb {
  r: number
  g: number
  b: number
}

interface WallLayer {
  id: string
  alpha: number
  rim: boolean
}

interface PropSpawn {
  climb: number
  side: "left" | "right"
  id: string
}

interface DustMote {
  x: number
  y: number
  phase: number
  freq: number
  speed: number
  alpha: number
  life: number
  age: number
  mote: boolean
}

const ZONE_BOUNDARIES: { at: number; lower: string; upper: string }[] = []
for (let i = 0; i < bg.sky_table.zones.length - 1; i++) {
  const end = bg.sky_table.zones[i]!.range[1]
  const lower = bg.walls.zone_wall[bg.sky_table.zones[i]!.zone]
  const upper = bg.walls.zone_wall[bg.sky_table.zones[i + 1]!.zone]
  if (end == null || !lower || !upper || lower === upper) continue
  ZONE_BOUNDARIES.push({ at: end, lower, upper })
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const span = edge1 - edge0
  if (span === 0) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / span))
  return t * t * (3 - 2 * t)
}

function parseHex(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbCss(c: Rgb): string {
  return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }
}

function hash01(n: number): number {
  let x = Math.imul(n + 1, 0x9e3779b1)
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  x = (x ^ (x >>> 16)) >>> 0
  return x / 4294967296
}

function zoneIndex(climb: number): number {
  const zones = bg.sky_table.zones
  for (let i = 0; i < zones.length; i++) {
    const end = zones[i]!.range[1]
    if (end == null || climb < end) return i
  }
  return zones.length - 1
}

function skyAt(climb: number): { top: Rgb; mid: Rgb; bottom: Rgb } {
  const zones = bg.sky_table.zones
  const i = zoneIndex(climb)
  const zone = zones[i]!
  let top = parseHex(zone.top)
  let mid = parseHex(zone.mid)
  let bottom = parseHex(zone.bottom)
  const blendWith = (other: SkyZone, t: number) => {
    top = lerpRgb(top, parseHex(other.top), t)
    mid = lerpRgb(mid, parseHex(other.mid), t)
    bottom = lerpRgb(bottom, parseHex(other.bottom), t)
  }
  if (i > 0) {
    const boundary = zones[i - 1]!.range[1]
    if (boundary != null && climb < boundary + SKY_BLEND) {
      const t = 1 - smoothstep(boundary - SKY_BLEND, boundary + SKY_BLEND, climb)
      blendWith(zones[i - 1]!, t)
    }
  }
  if (i < zones.length - 1) {
    const boundary = zone.range[1]
    if (boundary != null && climb > boundary - SKY_BLEND) {
      const t = smoothstep(boundary - SKY_BLEND, boundary + SKY_BLEND, climb)
      blendWith(zones[i + 1]!, t)
    }
  }
  return { top, mid, bottom }
}

function wallIdForClimb(climb: number): string {
  const zones = bg.sky_table.zones
  const zone = zones[zoneIndex(Math.max(0, climb))]!
  return bg.walls.zone_wall[zone.zone] ?? "walls/wall_rock_tile"
}

function layersAt(climb: number): WallLayer[] {
  for (const z of ZONE_BOUNDARIES) {
    if (climb < z.at - 48 || climb > z.at + 48) continue
    const t = smoothstep(z.at - 48, z.at + 48, climb)
    return [
      { id: z.lower, alpha: 1 - t, rim: false },
      { id: z.upper, alpha: t, rim: z.upper === NIGHT_WALL },
    ]
  }
  const id = wallIdForClimb(climb)
  return [{ id, alpha: 1, rim: id === NIGHT_WALL && climb >= NIGHT_CLIMB - 48 }]
}

/** Theme wall-body colour at a climb, blended across a zone crossfade. */
export function wallBodyColor(climb: number): string {
  const layers = layersAt(climb).filter((layer) => layer.alpha > 0.001)
  let acc = { r: 0, g: 0, b: 0 }
  let weight = 0
  for (const layer of layers) {
    const rgb = WALL_BODY[layer.id] ?? WALL_BODY["walls/wall_rock_tile"]!
    acc = {
      r: acc.r + rgb[0] * layer.alpha,
      g: acc.g + rgb[1] * layer.alpha,
      b: acc.b + rgb[2] * layer.alpha,
    }
    weight += layer.alpha
  }
  if (weight <= 0) return "#B4512F"
  return rgbCss({ r: acc.r / weight, g: acc.g / weight, b: acc.b / weight })
}

/**
 * Mount plate for an edge-mounted object. Flush to the bounce line, over
 * the wall's inner edge and under the sprite. 8 CSS wide, ~1.4× mount height.
 */
export function drawMountPlate(
  ctx: CanvasRenderingContext2D,
  side: "left" | "right",
  centerY: number,
  mountHeight: number,
  climb: number,
  playfieldWidth: number,
  ink: string,
): void {
  const h = Math.max(16, mountHeight * 1.4)
  const w = 8
  const x = side === "left" ? 0 : playfieldWidth - w
  const y = centerY - h / 2
  const night = climb >= NIGHT_CLIMB - SKY_BLEND
  const outline = night ? "#FFF1D6" : ink
  ctx.save()
  ctx.fillStyle = wallBodyColor(climb)
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = outline
  ctx.lineWidth = 2
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
  ctx.fillStyle = outline
  ctx.beginPath()
  const rivetX = x + w / 2
  ctx.arc(rivetX, y + h * 0.32, 1.35, 0, Math.PI * 2)
  ctx.arc(rivetX, y + h * 0.68, 1.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSky(ctx: CanvasRenderingContext2D, camera: Camera, climb: number): void {
  const stops = skyAt(climb)
  const { height, gutter } = camera
  const grd = ctx.createLinearGradient(0, 0, 0, height)
  grd.addColorStop(0, rgbCss(stops.top))
  grd.addColorStop(0.5, rgbCss(stops.mid))
  grd.addColorStop(1, rgbCss(stops.bottom))
  ctx.fillStyle = grd
  ctx.fillRect(-gutter - 2, 0, camera.width + gutter * 2 + 4, height)
}

function drawFarAndHaze(ctx: CanvasRenderingContext2D, camera: Camera, climb: number): void {
  const alpha = 1 - smoothstep(2000, 2400, climb)
  if (alpha <= 0.01) return
  const anchorY = camera.killScreenY + climb * 0.15
  drawSprite(ctx, FAR_ID, camera.width / 2, anchorY, { alpha })

  const haze = getSprite(HAZE_ID)
  if (!haze?.meta) return
  const anchorCss = haze.meta.anchor_px3[1] / 3
  const destY = anchorY - 30 - anchorCss
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.drawImage(
    haze.img,
    -camera.gutter,
    destY,
    camera.width + camera.gutter * 2,
    haze.meta.css[1],
  )
  ctx.restore()
}

function drawMidTiles(ctx: CanvasRenderingContext2D, camera: Camera, climb: number): void {
  const alpha = 1 - smoothstep(1700, 2100, climb)
  if (alpha <= 0.01) return
  const period = bg.sprites[MID_ID]?.tile_period_css ?? 684
  const base = camera.slingshotScreenY + climb * 0.4
  const kMin = Math.floor(-base / period) - 1
  const kMax = Math.ceil((camera.killScreenY - base) / period) + 1
  ctx.save()
  ctx.beginPath()
  ctx.rect(-camera.gutter, 0, camera.width + camera.gutter * 2, camera.killScreenY)
  ctx.clip()
  ctx.globalAlpha *= alpha
  for (let k = kMin; k <= kMax; k++) {
    const top = base + k * period
    if (top > camera.killScreenY || top + period < 0) continue
    drawSprite(ctx, MID_ID, camera.width / 2, top)
  }
  ctx.restore()
}

function drawBlend(ctx: CanvasRenderingContext2D, camera: Camera, climb: number): void {
  const sy = camera.slingshotScreenY - (2000 - climb)
  if (sy < -200 || sy > camera.height + 200) return
  drawSprite(ctx, BLEND_ID, camera.width / 2, sy)
}

let propLayout: PropSpawn[] | null = null

function props(): PropSpawn[] {
  if (propLayout) return propLayout
  const spawned: PropSpawn[] = []
  let climb = 0
  let side: "left" | "right" = hash01(2) < 0.5 ? "left" : "right"
  const recent: string[] = []
  let i = 0
  while (climb < 1950 && i < 64) {
    climb += 220 + hash01(i * 17 + 3) * 160
    if (climb > 1950) break
    if (hash01(i * 31 + 9) >= 0.3) {
      side = side === "left" ? "right" : "left"
    }
    const choices = PROP_IDS.filter((id) => !recent.includes(id))
    const id = choices[Math.floor(hash01(i * 13 + 5) * choices.length)] ?? PROP_IDS[0]
    recent.push(id)
    if (recent.length > 2) recent.shift()
    spawned.push({ climb, side, id })
    i++
  }
  propLayout = spawned
  return spawned
}

function blocked(spawn: PropSpawn, worldY: number, scenery: CanyonScenery): boolean {
  for (const portal of scenery.portals) {
    if (portal.side !== spawn.side) continue
    if (worldY >= portal.y - 70 && worldY <= portal.y + portal.height + 70) return true
  }
  for (const turret of scenery.turrets) {
    if (turret.side !== spawn.side) continue
    if (Math.abs(turret.y - worldY) <= 70) return true
  }
  return false
}

function drawProps(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  startHeight: number,
  climb: number,
  scenery: CanyonScenery,
): void {
  for (const spawn of props()) {
    const worldY = startHeight + spawn.climb
    const sy = camera.slingshotScreenY - (spawn.climb - climb)
    if (sy < -140 || sy > camera.height + 140) continue
    if (blocked(spawn, worldY, scenery)) continue
    const x = spawn.side === "left" ? 0 : camera.width
    drawSprite(ctx, spawn.id, x, sy, { flipX: spawn.side === "right" })
  }
}

const dust: DustMote[] = []
let dustWidth = -1
let dustClimb = 0
let dustSerial = 100

function makeDust(width: number, seed: number, scatterY: boolean): DustMote {
  const lane = hash01(seed * 97 + 11) < 0.7
  let alpha = 0.25 + hash01(seed * 53 + 4) * 0.25
  let x: number
  if (lane) {
    const span = Math.min(86, Math.max(8, width))
    const left = hash01(seed * 29 + 8) < 0.5
    const along = hash01(seed * 17 + 2) * span
    x = left ? along : width - along
  } else {
    x = hash01(seed * 23 + 3) * width
    alpha = Math.min(alpha, 0.3)
  }
  return {
    x,
    y: scatterY ? hash01(seed * 41 + 9) * 900 : 0,
    phase: hash01(seed * 7 + 1) * Math.PI * 2,
    freq: 0.7 + hash01(seed * 43 + 2) * 0.8,
    speed: 6 + hash01(seed * 11 + 5) * 8,
    alpha,
    life: 4 + hash01(seed * 13 + 7) * 3,
    age: scatterY ? hash01(seed * 31 + 12) * 5 : 0,
    mote: hash01(seed * 37 + 15) < 0.65,
  }
}

function ensureDust(width: number, height: number): void {
  if (dust.length === DUST_COUNT && Math.abs(dustWidth - width) < 1) return
  dust.length = 0
  dustWidth = width
  for (let i = 0; i < DUST_COUNT; i++) {
    const mote = makeDust(width, i + 1, true)
    mote.y = hash01(i * 19 + 4) * height
    dust.push(mote)
  }
}

function respawnDust(mote: DustMote, width: number, y: number): void {
  const next = makeDust(width, dustSerial++, false)
  mote.x = next.x
  mote.y = y
  mote.phase = next.phase
  mote.freq = next.freq
  mote.speed = next.speed
  mote.alpha = next.alpha
  mote.life = next.life
  mote.age = 0
  mote.mote = next.mote
}

function drawDust(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  climb: number,
  dt: number,
  time: number,
): void {
  ensureDust(camera.width, camera.height)
  const step = Math.min(Math.max(dt, 0), 0.05)
  const dc = climb - dustClimb
  dustClimb = climb
  const parallax = Math.abs(dc) < 800 ? dc * 0.6 : 0
  for (const mote of dust) {
    mote.age += step
    mote.y -= mote.speed * step + parallax
    if (mote.age >= mote.life || mote.y < -30) {
      respawnDust(mote, camera.width, camera.height + 12)
    } else if (mote.y > camera.height + 36) {
      mote.y = -12
    }
  }
  const zoneFade = 1 - smoothstep(4500, 5000, climb)
  if (zoneFade <= 0.01) return
  for (const mote of dust) {
    const fadeIn = Math.min(1, mote.age / 0.6)
    const fadeOut = Math.min(1, (mote.life - mote.age) / 0.6)
    const alpha = mote.alpha * Math.max(0, Math.min(fadeIn, fadeOut)) * zoneFade
    if (alpha <= 0.01) continue
    const id = mote.mote ? "fx/dust_mote" : "fx/dust_wisp"
    const tinted = tintedSprite(id, DUST_TINT)
    if (!tinted) continue
    const x = mote.x + Math.sin(time * mote.freq + mote.phase) * 8
    drawSprite(ctx, id, x, mote.y, { source: tinted, alpha })
  }
}

function innerEdge(id: string): number {
  return bg.sprites[id]?.inner_edge_x_css ?? 20
}

function paintStrip(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  side: "left" | "right",
  id: string,
  sy: number,
  srcY: number,
  destH: number,
  alpha: number,
): void {
  if (alpha <= 0.004 || destH <= 0.05) return
  const entry = getSprite(id)
  if (!entry?.meta || entry.img.naturalWidth === 0) return
  const cssW = entry.meta.css[0]
  const destX = -innerEdge(id)
  ctx.save()
  if (side === "right") {
    ctx.translate(camera.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.globalAlpha *= alpha
  ctx.drawImage(
    entry.img,
    0,
    srcY * 2,
    cssW * 2,
    destH * 2,
    destX,
    sy,
    cssW,
    destH,
  )
  ctx.restore()
}

function paintWallTile(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  side: "left" | "right",
  k: number,
  climb: number,
): void {
  const topClimb = (k + 1) * WALL_PERIOD
  const sy = camera.slingshotScreenY - (topClimb - climb)
  if (sy > camera.height + 4 || sy + WALL_PERIOD < -4) return

  const botClimb = k * WALL_PERIOD
  let slicing = false
  for (const z of ZONE_BOUNDARIES) {
    if (topClimb >= z.at - 48 && botClimb <= z.at + 48) {
      slicing = true
      break
    }
  }

  const drawLayers = (layers: WallLayer[], sliceSy: number, srcY: number, h: number) => {
    for (const layer of layers) {
      if (!layer.rim || layer.alpha <= 0.004) continue
      paintStrip(ctx, camera, side, NIGHT_RIM, sliceSy, srcY, h, layer.alpha)
    }
    for (const layer of layers) {
      paintStrip(ctx, camera, side, layer.id, sliceSy, srcY, h, layer.alpha)
    }
  }

  if (!slicing) {
    drawLayers(layersAt((topClimb + botClimb) / 2), sy, 0, WALL_PERIOD)
    return
  }

  const slice = 8
  for (let dy = 0; dy < WALL_PERIOD; dy += slice) {
    const sliceSy = sy + dy
    if (sliceSy > camera.height || sliceSy + slice < 0) continue
    const at = topClimb - dy - slice / 2
    drawLayers(layersAt(at), sliceSy, dy, slice)
  }
}

function drawWallSide(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  climb: number,
  side: "left" | "right",
): void {
  const span = camera.slingshotScreenY + climb
  const kMin = Math.floor((span - camera.height) / WALL_PERIOD) - 2
  const kMax = Math.ceil((span + WALL_PERIOD) / WALL_PERIOD) + 1
  ctx.save()
  ctx.beginPath()
  if (side === "left") {
    ctx.rect(
      -camera.gutter - 4,
      -WALL_PERIOD,
      camera.gutter + MAX_INTRUSION + 4.5,
      camera.height + WALL_PERIOD * 3,
    )
  } else {
    ctx.rect(
      camera.width - (MAX_INTRUSION + 0.5),
      -WALL_PERIOD,
      camera.gutter + MAX_INTRUSION + 8,
      camera.height + WALL_PERIOD * 3,
    )
  }
  ctx.clip()
  for (let k = kMin; k <= kMax; k++) {
    paintWallTile(ctx, camera, side, k, climb)
  }
  ctx.restore()
}

/** Sky, parallax layers, props, and dust. Walls are separate so the kill line stays above them. */
export function drawCanyonBackdrop(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  startHeight: number,
  dt: number,
  time: number,
  scenery: CanyonScenery,
): void {
  const climb = camera.y - startHeight
  drawSky(ctx, camera, climb)
  drawFarAndHaze(ctx, camera, climb)
  drawMidTiles(ctx, camera, climb)
  drawBlend(ctx, camera, climb)
  drawProps(ctx, camera, startHeight, climb, scenery)
  drawDust(ctx, camera, climb, dt, time)
}

/** Per-zone wall strips. Inner edge on x = 0 and x = width; body only in the gutter. */
export function drawCanyonWalls(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  startHeight: number,
): void {
  const climb = camera.y - startHeight
  drawWallSide(ctx, camera, climb, "left")
  drawWallSide(ctx, camera, climb, "right")
}
