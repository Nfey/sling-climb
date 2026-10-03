import manifestJson from "../../assets/art/manifest.json" with { type: "json" }
import bgManifestJson from "../../assets/art/ship-bg-manifest.json" with { type: "json" }
import { preloadLogos } from "./brand"
import { explicitAnchor, explicitFrames } from "./cosmeticsData"

/**
 * Sprite loader.
 *
 * Stage-1 files are `@2x.png` (2 file px per CSS px). Cosmetics v2 adds
 * `@1x` / `@half` / `@quarter` WebP (8 / 4 / 2 file px per CSS px). Each draw
 * picks the smallest tier whose file pixels cover the on-screen size.
 * `@1x` is fetched only when a draw needs it (menus and large previews).
 *
 * Place by anchor. Legacy CSS anchor = anchor_px3 / 3. Hi-res CSS anchor =
 * anchor_src / 8, or the centre (hats: brim line at 75% of the height,
 * slings: base at 472/640) when the manifest has no measured anchor.
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

interface Raster {
  img: HTMLImageElement
  pxPerCss: number
  lazy: boolean
  ready: boolean
  started: boolean
  load?: () => Promise<string>
}

interface InternalSprite {
  id: string
  legacy: boolean
  frames: number
  fps: number
  anchorSrc: [number, number] | null
  rasters: Raster[]
  publicMeta?: SpriteMeta
}

const pngUrls = import.meta.glob("../../assets/art/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const halfUrls = import.meta.glob("../../assets/art/**/*@half.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const quarterUrls = import.meta.glob("../../assets/art/**/*@quarter.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const lazy1x = import.meta.glob("../../assets/art/**/*@1x.webp", {
  query: "?url",
  import: "default",
}) as Record<string, () => Promise<string>>

const stageManifest = manifestJson as unknown as {
  sprites: Record<string, SpriteMeta>
}

const bgManifest = bgManifestJson as unknown as {
  sprites: Record<string, SpriteMeta>
}

const sprites = new Map<string, InternalSprite>()

function stageMeta(id: string): SpriteMeta | undefined {
  return stageManifest.sprites[id] ?? bgManifest.sprites[id]
}

function parseAsset(path: string): { id: string; tier: "1x" | "half" | "quarter" | "2x" } | null {
  const hires = path.match(/assets\/art\/(.+)@(1x|half|quarter)\.webp$/)
  if (hires?.[1] && hires[2]) {
    return { id: hires[1], tier: hires[2] as "1x" | "half" | "quarter" }
  }
  const legacy = path.match(/assets\/art\/(.+)@2x\.png$/)
  if (legacy?.[1]) return { id: legacy[1], tier: "2x" }
  return null
}

function pxPerCssFor(tier: "1x" | "half" | "quarter" | "2x"): number {
  if (tier === "1x") return 8
  if (tier === "half") return 4
  return 2
}

function ensureRecord(id: string, legacy: boolean): InternalSprite {
  let rec = sprites.get(id)
  if (!rec) {
    const frames = explicitFrames(id)
    rec = {
      id,
      legacy,
      frames: frames?.frames ?? 1,
      fps: frames?.fps ?? 0,
      anchorSrc: explicitAnchor(id),
      rasters: [],
      publicMeta: legacy ? stageMeta(id) : undefined,
    }
    sprites.set(id, rec)
  } else if (legacy) {
    rec.legacy = true
    rec.publicMeta = stageMeta(id) ?? rec.publicMeta
  }
  return rec
}

function addRaster(id: string, legacy: boolean, raster: Raster): void {
  const rec = ensureRecord(id, legacy)
  rec.rasters.push(raster)
  rec.rasters.sort((a, b) => a.pxPerCss - b.pxPerCss)
}

function makeEagerImage(url: string): HTMLImageElement {
  const img = new Image()
  img.src = url
  return img
}

for (const [path, url] of Object.entries(pngUrls)) {
  const parsed = parseAsset(path)
  if (!parsed) continue
  addRaster(parsed.id, true, {
    img: makeEagerImage(url),
    pxPerCss: pxPerCssFor(parsed.tier),
    lazy: false,
    ready: false,
    started: true,
  })
}

for (const [path, url] of Object.entries({ ...quarterUrls, ...halfUrls })) {
  const parsed = parseAsset(path)
  if (!parsed) continue
  addRaster(parsed.id, false, {
    img: makeEagerImage(url),
    pxPerCss: pxPerCssFor(parsed.tier),
    lazy: false,
    ready: false,
    started: true,
  })
}

for (const [path, loader] of Object.entries(lazy1x)) {
  const parsed = parseAsset(path)
  if (!parsed) continue
  addRaster(parsed.id, false, {
    img: new Image(),
    pxPerCss: pxPerCssFor(parsed.tier),
    lazy: true,
    ready: false,
    started: false,
    load: loader,
  })
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

function startRaster(raster: Raster): void {
  if (raster.started) return
  raster.started = true
  if (!raster.load) return
  void raster.load().then(
    (url) => {
      raster.img.src = url
      void decodeImage(raster.img).then((ok) => {
        raster.ready = ok
      })
    },
    () => {
      raster.ready = false
    },
  )
}

/** Decode every eager sprite. `@1x` stays unloaded until a draw needs it. */
export function preloadSprites(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = (async () => {
      const rasters: Raster[] = []
      for (const rec of sprites.values()) {
        for (const raster of rec.rasters) {
          if (!raster.lazy) rasters.push(raster)
        }
      }
      const [results] = await Promise.all([
        Promise.all(
          rasters.map(async (raster) => {
            const ok = await decodeImage(raster.img)
            raster.ready = ok
            return ok
          }),
        ),
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

function eagerRaster(rec: InternalSprite): Raster | undefined {
  return rec.rasters.find((r) => r.ready && !r.lazy) ?? rec.rasters.find((r) => r.ready)
}

export function getSprite(id: string): SpriteEntry | undefined {
  const rec = sprites.get(id)
  if (!rec) return undefined
  const raster = eagerRaster(rec)
  if (!raster) return undefined
  return { img: raster.img, meta: rec.publicMeta }
}

export function hasSprite(id: string): boolean {
  return sprites.has(id)
}

function frameCss(rec: InternalSprite): { w: number; h: number } | null {
  if (rec.legacy && rec.publicMeta) {
    const meta = rec.publicMeta
    const count = meta.frames && meta.frames > 1 ? meta.frames : 1
    if (meta.frame_css) return { w: meta.frame_css[0], h: meta.frame_css[1] }
    return { w: meta.css[0] / count, h: meta.css[1] }
  }
  const raster = rec.rasters.find((r) => r.ready && r.img.naturalWidth > 0)
  if (!raster) return null
  const count = rec.frames > 1 ? rec.frames : 1
  return {
    w: raster.img.naturalWidth / raster.pxPerCss / count,
    h: raster.img.naturalHeight / raster.pxPerCss,
  }
}

function anchorCss(rec: InternalSprite, frame: { w: number; h: number }): [number, number] {
  if (rec.legacy && rec.publicMeta) {
    return [rec.publicMeta.anchor_px3[0] / 3, rec.publicMeta.anchor_px3[1] / 3]
  }
  if (rec.anchorSrc) return [rec.anchorSrc[0] / 8, rec.anchorSrc[1] / 8]
  if (rec.id.startsWith("hats/")) return [frame.w / 2, frame.h * (288 / 384)]
  if (rec.id.startsWith("slings/")) return [frame.w / 2, frame.h * (472 / 640)]
  return [frame.w / 2, frame.h / 2]
}

function transformScale(ctx: CanvasRenderingContext2D): number {
  const t = ctx.getTransform()
  const scale = Math.hypot(t.a, t.b)
  return scale > 0 ? scale : 1
}

function chooseRaster(
  rec: InternalSprite,
  frame: { w: number; h: number },
  neededPx: number,
): Raster | null {
  const sorted = rec.rasters
  let chosen: Raster | null = null
  for (const raster of sorted) {
    chosen = raster
    const filePx = Math.max(frame.w, frame.h) * raster.pxPerCss
    if (filePx + 0.5 >= neededPx) break
  }
  if (!chosen) return null
  if (!chosen.ready) startRaster(chosen)
  if (chosen.ready) return chosen
  let fallback: Raster | null = null
  for (const raster of sorted) {
    if (!raster.ready) continue
    const filePx = Math.max(frame.w, frame.h) * raster.pxPerCss
    if (filePx <= neededPx + 0.5) fallback = raster
    else if (!fallback) fallback = raster
  }
  return fallback
}

export interface DrawSpriteOptions {
  scale?: number
  rotate?: number
  frame?: number
  flipX?: boolean
  alpha?: number
  composite?: GlobalCompositeOperation
  /** Draw the shipped night-rim layer first. Ignored when the sprite has no rim. */
  night?: boolean
  /** Replace the bitmap (tinted milestone cores). Anchor and frame stay. */
  source?: CanvasImageSource
  /** White-core tint applied to the chosen tier. */
  tint?: { color: string; alpha?: number }
}

function frameCount(rec: InternalSprite): number {
  if (rec.legacy && rec.publicMeta?.frames && rec.publicMeta.frames > 1) {
    return rec.publicMeta.frames
  }
  return rec.frames > 1 ? rec.frames : 1
}

/**
 * Draw `id` so its anchor sits on (x, y) in CSS pixels.
 * Returns false when the sprite is missing or not decoded yet.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  options: DrawSpriteOptions = {},
): boolean {
  const rec = sprites.get(id)
  if (!rec || !spritesReady()) return false
  const frame = frameCss(rec)
  if (!frame) return false
  const scale = options.scale ?? 1
  const needed = Math.max(frame.w, frame.h) * scale * transformScale(ctx)
  const raster = chooseRaster(rec, frame, needed)
  if (!raster) return false
  const count = frameCount(rec)
  const index = count > 1 ? Math.abs(Math.floor(options.frame ?? 0)) % count : 0
  const [anchorX, anchorY] = anchorCss(rec, frame)
  const tinted = options.tint ? tintRaster(raster, options.tint.color, options.tint.alpha ?? 1) : null
  const source = options.source ?? tinted ?? raster.img

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.translate(x, y)
  if (options.flipX) ctx.scale(-1, 1)
  if (options.rotate) ctx.rotate(options.rotate)
  if (scale !== 1) ctx.scale(scale, scale)
  if (options.alpha != null) ctx.globalAlpha *= options.alpha

  if (options.night && rec.publicMeta?.night_rim) {
    drawNightRim(ctx, rec.publicMeta, index, frame.w, frame.h)
  }

  if (options.composite) ctx.globalCompositeOperation = options.composite
  const srcScale = raster.pxPerCss
  ctx.drawImage(
    source,
    index * frame.w * srcScale,
    0,
    frame.w * srcScale,
    frame.h * srcScale,
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
  const rim = sprites.get(rimMeta.file)
  const raster = rim ? eagerRaster(rim) : undefined
  if (!rim || !raster) return
  const rimW = frameCssW + 4
  const rimH = frameCssH + 4
  const anchorX = meta.anchor_px3[0] / 3
  const anchorY = meta.anchor_px3[1] / 3
  const src = raster.pxPerCss
  ctx.drawImage(
    raster.img,
    frameIndex * rimW * src,
    0,
    rimW * src,
    rimH * src,
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
  const rec = sprites.get(options.spriteId ?? id)
  if (!rec || !spritesReady()) return false
  if (x1 <= x0) return true
  const frame = frameCss(rec)
  if (!frame || !rec.publicMeta) return false
  const meta = rec.publicMeta
  const needed = Math.max(frame.w, frame.h) * transformScale(ctx)
  const raster = chooseRaster(rec, frame, needed)
  if (!raster) return false
  const tileW = meta.css[0]
  const tileH = meta.css[1]
  const anchorX = meta.anchor_px3[0] / 3
  const destY = anchorY - meta.anchor_px3[1] / 3
  const source = options.source ?? raster.img
  const src = raster.pxPerCss

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  if (options.night && meta.night_rim) {
    drawNightRimTiles(ctx, meta, x0, x1, destY, tileW, tileH)
  }

  let x = x0 - anchorX
  while (x < x1 - 0.01) {
    const destW = Math.min(tileW, x1 - x)
    const srcW = (destW / tileW) * tileW * src
    ctx.drawImage(source, 0, 0, srcW, tileH * src, x, destY, destW, tileH)
    x += destW
  }
  ctx.restore()
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
  const rim = sprites.get(rimMeta.file)
  const raster = rim ? eagerRaster(rim) : undefined
  if (!raster) return
  const rimW = tileW + 4
  const rimH = tileH + 4
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 - 2, destY - 2, x1 - x0 + 4, rimH)
  ctx.clip()
  const anchorX = meta.anchor_px3[0] / 3
  let x = x0 - anchorX
  while (x < x1 - 0.01) {
    ctx.drawImage(raster.img, x - 2, destY - 2, rimW, rimH)
    x += tileW
  }
  ctx.restore()
}

const tintCache = new Map<string, HTMLCanvasElement>()

function tintRaster(raster: Raster, color: string, alpha: number): HTMLCanvasElement | null {
  if (!raster.ready || raster.img.naturalWidth === 0) return null
  const key = `${raster.img.src}|${raster.pxPerCss}|${color}|${alpha}`
  const cached = tintCache.get(key)
  if (cached) return cached
  const canvas = document.createElement("canvas")
  canvas.width = raster.img.naturalWidth
  canvas.height = raster.img.naturalHeight
  const g = canvas.getContext("2d")
  if (!g) return null
  g.drawImage(raster.img, 0, 0)
  g.globalCompositeOperation = "source-in"
  g.globalAlpha = alpha
  g.fillStyle = color
  g.fillRect(0, 0, canvas.width, canvas.height)
  tintCache.set(key, canvas)
  return canvas
}

/** White-core sprite tinted with `color` (source-in). Cached per colour. */
export function tintedSprite(id: string, color: string): HTMLCanvasElement | null {
  const key = `${id}|${color}`
  const cached = tintCache.get(key)
  if (cached) return cached
  const rec = sprites.get(id)
  const raster = rec ? eagerRaster(rec) : undefined
  if (!raster) return null
  const tinted = tintRaster(raster, color, 1)
  if (!tinted) return null
  tintCache.set(key, tinted)
  return tinted
}

export function spriteFrame(id: string, time: number): number {
  const rec = sprites.get(id)
  if (!rec) return 0
  const fps = rec.legacy ? (rec.publicMeta?.fps ?? 0) : rec.fps
  const frames = frameCount(rec)
  if (frames < 2 || !fps) return 0
  const frame = Math.floor(time * fps) % frames
  return frame < 0 ? frame + frames : frame
}

/**
 * Bitmap of `id` at `pxPerCss` (or the closest ready tier). Used to build
 * the runtime night rim from skin + static alpha.
 */
export function spriteBitmap(
  id: string,
  pxPerCss: number,
): { img: HTMLImageElement; pxPerCss: number } | null {
  const rec = sprites.get(id)
  if (!rec) return null
  const sorted = rec.rasters
  let chosen: Raster | null = null
  for (const raster of sorted) {
    if (raster.pxPerCss + 0.01 >= pxPerCss) {
      chosen = raster
      break
    }
    chosen = raster
  }
  if (!chosen) return null
  if (!chosen.ready) startRaster(chosen)
  if (!chosen.ready || chosen.img.naturalWidth === 0) {
    const ready = [...sorted].reverse().find((r) => r.ready && r.img.naturalWidth > 0)
    if (!ready) return null
    return { img: ready.img, pxPerCss: ready.pxPerCss }
  }
  return { img: chosen.img, pxPerCss: chosen.pxPerCss }
}

/**
 * Stretch `id` into a rectangle, ignoring the anchor. Used for the
 * locked-card progress chip and its 3-slice fill.
 */
export function drawSpriteBox(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const rec = sprites.get(id)
  if (!rec || !spritesReady()) return false
  const frame = frameCss(rec)
  if (!frame || w <= 0 || h <= 0) return false
  const needed = Math.max(w, h) * transformScale(ctx)
  const raster = chooseRaster(rec, frame, needed)
  if (!raster) return false
  const src = raster.pxPerCss
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(raster.img, 0, 0, frame.w * src, frame.h * src, x, y, w, h)
  ctx.restore()
  return true
}

/** File px per CSS px the next draw of `id` would use, given the current transform. */
export function spriteDrawDensity(
  ctx: CanvasRenderingContext2D,
  id: string,
  scale = 1,
): number | null {
  const rec = sprites.get(id)
  if (!rec) return null
  const frame = frameCss(rec)
  if (!frame) return null
  const needed = Math.max(frame.w, frame.h) * scale * transformScale(ctx)
  const raster = chooseRaster(rec, frame, needed)
  return raster?.pxPerCss ?? null
}

void preloadSprites()
