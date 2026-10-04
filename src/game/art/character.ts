import { drawHatStyle, type HatStyle } from "../hats"
import { ballSkin, hatPlacement } from "./cosmeticsData"
import {
  drawSprite,
  hasSprite,
  spriteBitmap,
  spriteDrawDensity,
  spriteFrame,
  spritesReady,
} from "./sprites"

/**
 * One character draw for gameplay, shop, gacha preview, and the reveal strip.
 *
 * Inside translate → scale(squash): night rim, hat back, skin (rotated),
 * knock tint, light, static, face, blush tint, hat front or headband.
 * Skin spins. Light, face, and hats stay upright.
 */

export interface CharacterDraw {
  /** `balls/<ballId>` skin. `bonus` is the purple ball. */
  ballId: string
  hatId: HatStyle | null
  /** Classic ball with no hat wears the stage-1 headband. */
  headband: boolean
  spin: number
  squashX: number
  squashY: number
  /** Ball squash amount used by the face (0 at rest). */
  squash: number
  speed: number
  lookX: number
  lookY: number
  night: boolean
  time: number
}

const FACE_STATES = [
  "idle",
  "blink1",
  "blink2",
  "determined",
  "joy",
  "ecstatic",
  "scared",
  "relieved",
  "dizzy",
] as const

type FaceState = (typeof FACE_STATES)[number]

const NIGHT_RIM = "#FFF1D6"
const rimCache = new Map<string, HTMLCanvasElement>()

function faceState(time: number, squash: number, speed: number): FaceState {
  if (squash > 0.55) return "determined"
  if (speed > 900) return "ecstatic"
  if (speed > 520) return "joy"
  const cycle = time % 3.4
  if (cycle > 3.22 && cycle <= 3.3) return "blink1"
  if (cycle > 3.3 && cycle <= 3.38) return "blink2"
  return "idle"
}

function runtimeNightRim(
  skinId: string,
  staticId: string | null,
  pxPerCss: number,
): { canvas: HTMLCanvasElement; pxPerCss: number } | null {
  const key = `${skinId}|${staticId ?? ""}|${pxPerCss}`
  const cached = rimCache.get(key)
  if (cached) return { canvas: cached, pxPerCss }
  const skin = spriteBitmap(skinId, pxPerCss)
  if (!skin || skin.img.naturalWidth === 0) return null
  const stat = staticId ? spriteBitmap(staticId, pxPerCss) : null
  const px = skin.pxPerCss
  let css = Math.max(skin.img.naturalWidth, skin.img.naturalHeight) / skin.pxPerCss
  if (stat && stat.img.naturalWidth > 0) {
    css = Math.max(css, stat.img.naturalWidth / stat.pxPerCss, stat.img.naturalHeight / stat.pxPerCss)
  }
  const srcPx = Math.max(1, Math.round(css * px))
  const src = document.createElement("canvas")
  src.width = srcPx
  src.height = srcPx
  const sg = src.getContext("2d")
  if (!sg) return null
  const blit = (img: HTMLImageElement, imgPx: number) => {
    const w = (img.naturalWidth / imgPx) * px
    const h = (img.naturalHeight / imgPx) * px
    sg.drawImage(img, (srcPx - w) / 2, (srcPx - h) / 2, w, h)
  }
  blit(skin.img, skin.pxPerCss)
  if (stat && stat.img.naturalWidth > 0) blit(stat.img, stat.pxPerCss)

  const pad = Math.max(1, Math.round(2 * px))
  const out = document.createElement("canvas")
  out.width = srcPx + pad * 2
  out.height = srcPx + pad * 2
  const g = out.getContext("2d")
  if (!g) return null
  const steps = 16
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    g.drawImage(src, pad + Math.cos(a) * pad, pad + Math.sin(a) * pad)
  }
  g.globalCompositeOperation = "destination-out"
  g.drawImage(src, pad, pad)
  g.globalCompositeOperation = "source-in"
  g.fillStyle = NIGHT_RIM
  g.fillRect(0, 0, out.width, out.height)
  rimCache.set(key, out)
  return { canvas: out, pxPerCss: px }
}

function drawRuntimeNightRim(
  ctx: CanvasRenderingContext2D,
  skinId: string,
  staticId: string | null,
  scale: number,
): void {
  const density = spriteDrawDensity(ctx, skinId, scale)
  if (!density) return
  const rim = runtimeNightRim(skinId, staticId, density)
  if (!rim) return
  const cssW = rim.canvas.width / rim.pxPerCss
  const cssH = rim.canvas.height / rim.pxPerCss
  ctx.save()
  ctx.globalAlpha *= 0.7
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(
    rim.canvas,
    (-cssW / 2) * scale,
    (-cssH / 2) * scale,
    cssW * scale,
    cssH * scale,
  )
  ctx.restore()
}

function drawHatLayer(
  ctx: CanvasRenderingContext2D,
  hatId: HatStyle,
  radius: number,
  time: number,
  squashX: number,
  squashY: number,
  spin: number,
  part: "back" | "front",
): void {
  if (hatId === "none") return
  const place = hatPlacement(hatId)
  const spriteId = part === "back" ? `hats/${hatId}_back` : `hats/${hatId}`
  const art = part === "back" ? place.layer === "split" && hasSprite(spriteId) : hasSprite(spriteId)
  if (part === "back" && !art) return
  if (part === "front" && !art) {
    drawHatStyle(ctx, hatId, radius, time)
    return
  }
  ctx.save()
  ctx.translate(place.seat_r[0] * radius, place.seat_r[1] * radius)
  if (!place.follow_squash) ctx.scale(1 / squashX, 1 / squashY)
  if (place.follow_spin) ctx.rotate(spin)
  if (place.tilt_deg) ctx.rotate((place.tilt_deg * Math.PI) / 180)
  if (place.pulse) {
    const [a0, a1] = place.pulse.alpha
    const mid = (a0 + a1) / 2
    const amp = (a1 - a0) / 2
    ctx.globalAlpha *= mid + amp * Math.sin(time * place.pulse.hz * Math.PI * 2)
  }
  const scale = (radius / 14) * place.scale
  drawSprite(ctx, spriteId, 0, 0, { scale, frame: spriteFrame(spriteId, time) })
  if (part === "front") {
    for (const piece of place.parts) {
      const ox = ((piece.at_src[0] - place.anchor_src[0]) / 8) * scale
      const oy = ((piece.at_src[1] - place.anchor_src[1]) / 8) * scale
      ctx.save()
      ctx.translate(ox, oy)
      ctx.rotate(time * piece.spin_rad_s)
      drawSprite(ctx, piece.id, 0, 0, { scale })
      ctx.restore()
    }
  }
  ctx.restore()
}

function drawHeadband(ctx: CanvasRenderingContext2D, radius: number, night: boolean): void {
  const scale = radius / 14
  if (hasSprite("hats/headband")) {
    const place = hatPlacement("headband")
    if (place.legacy_center) {
      drawSprite(ctx, "hats/headband", 0, 0, { scale, night })
      return
    }
  }
  drawSprite(ctx, "character/hat_headband", 0, 0, { scale, night })
}

/** Returns false when the skin sprite is missing, so the caller keeps the procedural ball. */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  opts: CharacterDraw,
): boolean {
  if (!spritesReady()) return false
  const skinId = `balls/${opts.ballId}`
  if (!hasSprite(skinId)) return false
  const scale = radius / 14
  if (spriteDrawDensity(ctx, skinId, scale) == null) return false

  const skin = ballSkin(opts.ballId)
  const state = faceState(opts.time, opts.squash, opts.speed)
  const blinking = state !== "idle" && opts.squash <= 0.55 && opts.speed <= 520
  const useLook = opts.speed > 40 && !blinking && opts.squash <= 0.55
  const [fox, foy] = skin.face_offset_r

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(opts.squashX, opts.squashY)

  if (opts.night) drawRuntimeNightRim(ctx, skinId, skin.static_layer, scale)
  if (opts.hatId && opts.hatId !== "none") {
    drawHatLayer(ctx, opts.hatId, radius, opts.time, opts.squashX, opts.squashY, opts.spin, "back")
  }

  ctx.save()
  ctx.rotate(opts.spin)
  const drewSkin = drawSprite(ctx, skinId, 0, 0, { scale })
  ctx.restore()
  if (!drewSkin) {
    ctx.restore()
    return false
  }

  if (skin.face_knock) {
    drawSprite(ctx, `face/knock_${state}`, fox * radius, foy * radius, {
      scale,
      tint: { color: skin.face_knock },
    })
  }
  if (skin.light) drawSprite(ctx, skin.light, 0, 0, { scale })
  if (skin.static_layer) drawSprite(ctx, skin.static_layer, 0, 0, { scale })

  if (useLook) {
    drawSprite(ctx, "face/idle-nopupil", fox * radius, foy * radius, { scale })
    const eyes: Array<[number, number]> = [
      [-0.38, -0.06],
      [0.38, -0.06],
    ]
    for (const [ex, ey] of eyes) {
      drawSprite(
        ctx,
        "face/pupil",
        (ex + opts.lookX * 0.1035) * radius,
        (ey + opts.lookY * 0.1265) * radius,
        { scale },
      )
    }
  } else {
    drawSprite(ctx, `face/${state}`, fox * radius, foy * radius, { scale })
  }

  drawSprite(ctx, "face/blush", fox * radius, foy * radius, {
    scale,
    tint: { color: skin.blush, alpha: skin.blush_alpha },
  })

  if (opts.hatId && opts.hatId !== "none") {
    drawHatLayer(ctx, opts.hatId, radius, opts.time, opts.squashX, opts.squashY, opts.spin, "front")
  } else if (opts.headband) {
    drawHeadband(ctx, radius, opts.night)
  }

  ctx.restore()
  return true
}
