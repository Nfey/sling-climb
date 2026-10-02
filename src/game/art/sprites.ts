import manifestJson from "../../assets/art/manifest.json" with { type: "json" }
import { preloadLogos } from "./brand"

/**
 * Sling Bounce stage-1 sprites. Files are @2x; the engine caps DPR at 2.
 *
 * Place by anchor: CSS offset = anchor_px3 / 3 (anchor_px3 / 1.5 is @2x file
 * pixels, and those pixels are drawn at half size). Never align a canvas
 * corner to an engine position.
 *
 * `character/ball_hero` (and its night rim) stay in the manifest but the PNGs
 * were left out on purpose. The loader skips them.
 */

export interface NightRimMeta {
  file: string
  px3: [number, number]
  offset_px3: [number, number]
}

export interface SpriteMeta {
  css: [number, number]
  anchor_px3: [number, number]
  frames?: number
  fps?: number
  frame_css?: [number, number]
  night_rim?: NightRimMeta
  order?: readonly string[]
}

interface SpriteEntry {
  img: HTMLImageElement
  meta?: SpriteMeta
}

const artUrls = import.meta.glob("../../assets/art/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const manifest = manifestJson as unknown as {
  sprites: Record<string, SpriteMeta>
}

const entries = new Map<string, SpriteEntry>()

function spriteIdFromPath(path: string): string | null {
  const match = path.match(/assets\/art\/(.+)@2x\.png$/)
  if (!match?.[1]) return null
  return match[1]
}

/** Hero Orange is not wired until the Design Director picks it. */
export function isSkippedSprite(id: string): boolean {
  return id === "character/ball_hero" || id === "character/night-rim/ball_hero"
}

for (const [path, url] of Object.entries(artUrls)) {
  const id = spriteIdFromPath(path)
  if (!id || isSkippedSprite(id)) continue
  const img = new Image()
  img.src = url
  const meta = manifest.sprites[id]
  entries.set(id, meta ? { img, meta } : { img })
}

let ready = false
let preloadPromise: Promise<void> | null = null

export function spritesReady(): boolean {
  return ready
}

function decodeImage(img: HTMLImageElement): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      if (!ok) {
        resolve(false)
        return
      }
      img.decode().then(
        () => resolve(true),
        () => resolve(img.naturalWidth > 0),
      )
    }
    if (img.complete && img.naturalWidth > 0) {
      finish(true)
      return
    }
    img.onload = () => finish(true)
    img.onerror = () => finish(false)
  })
}

/** Decode every shipped sprite. Rejects the ready flag if any file fails. */
export function preloadSprites(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = (async () => {
      const [results] = await Promise.all([
        Promise.all([...entries.values()].map((entry) => decodeImage(entry.img))),
        preloadLogos(),
      ])
      ready = results.every(Boolean)
      if (typeof document !== "undefined") {
        document.documentElement.dataset.artReady = ready ? "1" : "0"
      }
    })()
  }
  return preloadPromise
}

export function getSprite(id: string): SpriteEntry | undefined {
  if (isSkippedSprite(id)) return undefined
  return entries.get(id)
}

export interface DrawSpriteOptions {
  scale?: number
  rotate?: number
  frame?: number
  flipX?: boolean
  alpha?: number
  composite?: GlobalCompositeOperation
  /** Draw the night-rim layer first. Ignored when the sprite has no rim. */
  night?: boolean
  /** Replace the bitmap (tinted milestone cores). Anchor and frame stay. */
  source?: CanvasImageSource
}

function frameSize(meta: SpriteMeta): { w: number; h: number; count: number } {
  const count = meta.frames && meta.frames > 1 ? meta.frames : 1
  if (meta.frame_css) {
    return { w: meta.frame_css[0], h: meta.frame_css[1], count }
  }
  return {
    w: meta.css[0] / count,
    h: meta.css[1],
    count,
  }
}

/**
 * Draw `id` so its manifest anchor sits on (x, y) in CSS pixels.
 * Returns false when the sprite is missing or not decoded yet.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  options: DrawSpriteOptions = {},
): boolean {
  const entry = getSprite(id)
  if (!entry?.meta || !spritesReady()) return false
  const meta = entry.meta
  const scale = options.scale ?? 1
  const frame = frameSize(meta)
  const index =
    frame.count > 1 ? Math.abs(Math.floor(options.frame ?? 0)) % frame.count : 0
  const anchorX = meta.anchor_px3[0] / 3
  const anchorY = meta.anchor_px3[1] / 3

  ctx.save()
  ctx.translate(x, y)
  if (options.flipX) ctx.scale(-1, 1)
  if (options.rotate) ctx.rotate(options.rotate)
  if (scale !== 1) ctx.scale(scale, scale)
  if (options.alpha != null) ctx.globalAlpha *= options.alpha

  if (options.night && meta.night_rim) {
    drawNightRim(ctx, meta, index, frame.w, frame.h)
  }

  if (options.composite) ctx.globalCompositeOperation = options.composite
  const source = options.source ?? entry.img
  ctx.drawImage(
    source,
    index * frame.w * 2,
    0,
    frame.w * 2,
    frame.h * 2,
    -anchorX,
    -anchorY,
    frame.w,
    frame.h,
  )
  ctx.restore()
  return true
}

/** Rim canvas is +4 CSS per frame. Offset is (−2, −2) CSS from the frame top-left. */
function drawNightRim(
  ctx: CanvasRenderingContext2D,
  meta: SpriteMeta,
  frameIndex: number,
  frameCssW: number,
  frameCssH: number,
): void {
  const rimMeta = meta.night_rim
  if (!rimMeta) return
  const rim = getSprite(rimMeta.file)
  if (!rim) return
  const rimW = frameCssW + 4
  const rimH = frameCssH + 4
  const anchorX = meta.anchor_px3[0] / 3
  const anchorY = meta.anchor_px3[1] / 3
  ctx.drawImage(
    rim.img,
    frameIndex * rimW * 2,
    0,
    rimW * 2,
    rimH * 2,
    -anchorX - 2,
    -anchorY - 2,
    rimW,
    rimH,
  )
}

export interface TileOptions {
  night?: boolean
  source?: CanvasImageSource
  /** Extra source id, defaults to `id`. */
  spriteId?: string
}

/**
 * Tile a horizontal strip from x0 to x1. The manifest anchor row sits on
 * `anchorY`. The last tile is cropped. Anchor x is the tile's left edge.
 */
export function drawSpriteTile(
  ctx: CanvasRenderingContext2D,
  id: string,
  x0: number,
  x1: number,
  anchorY: number,
  options: TileOptions = {},
): boolean {
  const entry = getSprite(options.spriteId ?? id)
  if (!entry?.meta || !spritesReady()) return false
  if (x1 <= x0) return true
  const meta = entry.meta
  const tileW = meta.css[0]
  const tileH = meta.css[1]
  const anchorX = meta.anchor_px3[0] / 3
  const destY = anchorY - meta.anchor_px3[1] / 3
  const source = options.source ?? entry.img

  if (options.night && meta.night_rim) {
    drawNightRimTiles(ctx, meta, x0, x1, destY, tileW, tileH)
  }

  let x = x0 - anchorX
  while (x < x1 - 0.01) {
    const destW = Math.min(tileW, x1 - x)
    const srcW = (destW / tileW) * tileW * 2
    ctx.drawImage(source, 0, 0, srcW, tileH * 2, x, destY, destW, tileH)
    x += destW
  }
  return true
}

function drawNightRimTiles(
  ctx: CanvasRenderingContext2D,
  meta: SpriteMeta,
  x0: number,
  x1: number,
  destY: number,
  tileW: number,
  tileH: number,
): void {
  const rimMeta = meta.night_rim
  if (!rimMeta) return
  const rim = getSprite(rimMeta.file)
  if (!rim) return
  const rimW = tileW + 4
  const rimH = tileH + 4
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 - 2, destY - 2, x1 - x0 + 4, rimH)
  ctx.clip()
  const anchorX = meta.anchor_px3[0] / 3
  let x = x0 - anchorX
  while (x < x1 - 0.01) {
    ctx.drawImage(rim.img, x - 2, destY - 2, rimW, rimH)
    x += tileW
  }
  ctx.restore()
}

const tintCache = new Map<string, HTMLCanvasElement>()

/** White-core sprite tinted with `color` (source-in). Cached per colour. */
export function tintedSprite(id: string, color: string): HTMLCanvasElement | null {
  const key = `${id}|${color}`
  const cached = tintCache.get(key)
  if (cached) return cached
  const entry = getSprite(id)
  if (!entry || entry.img.naturalWidth === 0) return null
  const canvas = document.createElement("canvas")
  canvas.width = entry.img.naturalWidth
  canvas.height = entry.img.naturalHeight
  const g = canvas.getContext("2d")
  if (!g) return null
  g.drawImage(entry.img, 0, 0)
  g.globalCompositeOperation = "source-in"
  g.fillStyle = color
  g.fillRect(0, 0, canvas.width, canvas.height)
  tintCache.set(key, canvas)
  return canvas
}

export function spriteFrame(id: string, time: number): number {
  const meta = getSprite(id)?.meta
  if (!meta?.frames || !meta.fps || meta.frames < 2) return 0
  const frame = Math.floor(time * meta.fps) % meta.frames
  return frame < 0 ? frame + meta.frames : frame
}

void preloadSprites()
