/** Ball-top hats: gacha / login cosmetics (visual only). */

export type HatRarity = "common" | "uncommon" | "rare" | "epic"

export type HatStyle =
  | "none"
  | "party"
  | "beanie"
  | "hardhat"
  | "paperboat"
  | "cowboy"
  | "chef"
  | "propeller"
  | "viking"
  | "tophat"
  | "crown"
  | "wizard"
  | "santa"
  | "flower"
  | "duck"
  | "halo"
  | "rainbow"

export interface HatVariant {
  id: string
  name: string
  style: HatStyle
  rarity: HatRarity
}

export const HAT_UNLOCKS_KEY = "sling-climb-hat-unlocks"
export const EQUIPPED_HAT_KEY = "sling-climb-equipped-hat"
export const GACHA_PITY_KEY = "sling-climb-gacha-pity"

export const HAT_VARIANTS: readonly HatVariant[] = [
  { id: "party", name: "Party Cone", style: "party", rarity: "common" },
  { id: "beanie", name: "Beanie", style: "beanie", rarity: "common" },
  { id: "hardhat", name: "Hard Hat", style: "hardhat", rarity: "common" },
  { id: "paperboat", name: "Paper Boat", style: "paperboat", rarity: "common" },
  { id: "cowboy", name: "Cowboy", style: "cowboy", rarity: "uncommon" },
  { id: "chef", name: "Chef", style: "chef", rarity: "uncommon" },
  { id: "propeller", name: "Propeller", style: "propeller", rarity: "uncommon" },
  { id: "viking", name: "Viking", style: "viking", rarity: "uncommon" },
  { id: "tophat", name: "Top Hat", style: "tophat", rarity: "rare" },
  { id: "crown", name: "Crown", style: "crown", rarity: "rare" },
  { id: "wizard", name: "Wizard", style: "wizard", rarity: "rare" },
  { id: "santa", name: "Santa Cap", style: "santa", rarity: "rare" },
  { id: "flower", name: "Flower", style: "flower", rarity: "rare" },
  { id: "duck", name: "Rubber Duck", style: "duck", rarity: "epic" },
  { id: "halo", name: "Halo", style: "halo", rarity: "epic" },
  { id: "rainbow", name: "Rainbow Cap", style: "rainbow", rarity: "epic" },
]

export const RARITY_LABEL: Record<HatRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
}

export const RARITY_COLOR: Record<HatRarity, string> = {
  common: "#64748b",
  uncommon: "#16a34a",
  rare: "#2563eb",
  epic: "#c026d3",
}

/** Coin refund when a gacha pull duplicates an owned hat. */
export const HAT_DUPLICATE_REFUND: Record<HatRarity, number> = {
  common: 2,
  uncommon: 4,
  rare: 8,
  epic: 15,
}

export function findHatVariant(id: string): HatVariant | undefined {
  return HAT_VARIANTS.find((v) => v.id === id)
}

export function hatsByRarity(rarity: HatRarity): HatVariant[] {
  return HAT_VARIANTS.filter((v) => v.rarity === rarity)
}

/**
 * Draw a hat sitting on a ball centered at (0,0) with the given radius.
 * Drawn upright in screen space (caller should not apply ball spin).
 */
export function drawHatStyle(
  ctx: CanvasRenderingContext2D,
  style: HatStyle,
  radius: number,
  time = 0,
): void {
  if (style === "none") return
  const r = radius
  switch (style) {
    case "party":
      drawPartyCone(ctx, r)
      break
    case "beanie":
      drawBeanie(ctx, r, "#3b82f6", "#1d4ed8")
      break
    case "hardhat":
      drawHardHat(ctx, r)
      break
    case "paperboat":
      drawPaperBoat(ctx, r)
      break
    case "cowboy":
      drawCowboy(ctx, r)
      break
    case "chef":
      drawChef(ctx, r)
      break
    case "propeller":
      drawPropeller(ctx, r, time)
      break
    case "viking":
      drawViking(ctx, r)
      break
    case "tophat":
      drawTopHat(ctx, r)
      break
    case "crown":
      drawCrown(ctx, r)
      break
    case "wizard":
      drawWizard(ctx, r)
      break
    case "santa":
      drawSanta(ctx, r)
      break
    case "flower":
      drawFlower(ctx, r)
      break
    case "duck":
      drawDuck(ctx, r)
      break
    case "halo":
      drawHalo(ctx, r, time)
      break
    case "rainbow":
      drawBeanie(ctx, r, rainbowHatColor(time), rainbowHatColor(time + 0.4))
      break
  }
}

function rainbowHatColor(time: number): string {
  const hue = ((time * 70) % 360 + 360) % 360
  return `hsl(${hue}, 82%, 52%)`
}

function drawPartyCone(ctx: CanvasRenderingContext2D, r: number): void {
  const baseY = -r * 0.72
  ctx.fillStyle = "#f97316"
  ctx.beginPath()
  ctx.moveTo(0, baseY - r * 1.15)
  ctx.lineTo(-r * 0.55, baseY)
  ctx.lineTo(r * 0.55, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = "#c2410c"
  ctx.lineWidth = 1.2
  ctx.stroke()
  // Pom
  ctx.fillStyle = "#fef08a"
  ctx.beginPath()
  ctx.arc(0, baseY - r * 1.15, r * 0.14, 0, Math.PI * 2)
  ctx.fill()
  // Dots
  ctx.fillStyle = "#fff"
  for (const [x, y] of [
    [-0.18, -0.35],
    [0.2, -0.55],
    [-0.05, -0.75],
  ] as const) {
    ctx.beginPath()
    ctx.arc(x * r, baseY + y * r, r * 0.07, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBeanie(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  brim: string,
): void {
  const y = -r * 0.55
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.ellipse(0, y, r * 0.72, r * 0.48, 0, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = brim
  ctx.fillRect(-r * 0.78, y - r * 0.04, r * 1.56, r * 0.22)
  ctx.fillStyle = "#fef3c7"
  ctx.beginPath()
  ctx.arc(0, y - r * 0.48, r * 0.16, 0, Math.PI * 2)
  ctx.fill()
}

function drawHardHat(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.55
  ctx.fillStyle = "#eab308"
  ctx.beginPath()
  ctx.ellipse(0, y, r * 0.7, r * 0.42, 0, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = "#ca8a04"
  ctx.beginPath()
  ctx.ellipse(0, y + r * 0.05, r * 0.95, r * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#a16207"
  ctx.fillRect(-r * 0.08, y - r * 0.35, r * 0.16, r * 0.35)
}

function drawPaperBoat(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.7
  ctx.fillStyle = "#e2e8f0"
  ctx.strokeStyle = "#94a3b8"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-r * 0.75, y + r * 0.15)
  ctx.lineTo(0, y - r * 0.55)
  ctx.lineTo(r * 0.75, y + r * 0.15)
  ctx.lineTo(r * 0.35, y + r * 0.35)
  ctx.lineTo(-r * 0.35, y + r * 0.35)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function drawCowboy(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.55
  ctx.fillStyle = "#92400e"
  ctx.beginPath()
  ctx.ellipse(0, y + r * 0.08, r * 1.05, r * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#78350f"
  ctx.beginPath()
  ctx.ellipse(0, y - r * 0.05, r * 0.55, r * 0.38, 0, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = "#b45309"
  ctx.fillRect(-r * 0.55, y - r * 0.02, r * 1.1, r * 0.12)
}

function drawChef(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.5
  ctx.fillStyle = "#fff"
  ctx.strokeStyle = "#cbd5e1"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(0, y - r * 0.35, r * 0.55, r * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(-r * 0.28, y - r * 0.15, r * 0.28, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(r * 0.28, y - r * 0.15, r * 0.28, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#f8fafc"
  ctx.fillRect(-r * 0.45, y - r * 0.05, r * 0.9, r * 0.28)
  ctx.strokeRect(-r * 0.45, y - r * 0.05, r * 0.9, r * 0.28)
}

function drawPropeller(ctx: CanvasRenderingContext2D, r: number, time: number): void {
  drawBeanie(ctx, r, "#ef4444", "#b91c1c")
  const y = -r * 1.15
  ctx.save()
  ctx.translate(0, y)
  ctx.rotate(time * 10)
  ctx.fillStyle = "#334155"
  ctx.fillRect(-r * 0.55, -r * 0.06, r * 1.1, r * 0.12)
  ctx.fillRect(-r * 0.06, -r * 0.55, r * 0.12, r * 1.1)
  ctx.fillStyle = "#64748b"
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawViking(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.55
  ctx.fillStyle = "#78716c"
  ctx.beginPath()
  ctx.ellipse(0, y, r * 0.7, r * 0.4, 0, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = "#a8a29e"
  ctx.fillRect(-r * 0.72, y - r * 0.02, r * 1.44, r * 0.18)
  // Horns
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#f5f5f4"
    ctx.beginPath()
    ctx.moveTo(side * r * 0.55, y - r * 0.1)
    ctx.quadraticCurveTo(side * r * 1.05, y - r * 0.7, side * r * 0.75, y - r * 0.95)
    ctx.quadraticCurveTo(side * r * 0.55, y - r * 0.45, side * r * 0.4, y - r * 0.05)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "#a8a29e"
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function drawTopHat(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.55
  ctx.fillStyle = "#1e293b"
  ctx.beginPath()
  ctx.ellipse(0, y + r * 0.05, r * 0.95, r * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(-r * 0.42, y - r * 0.85, r * 0.84, r * 0.9)
  ctx.fillStyle = "#7f1d1d"
  ctx.fillRect(-r * 0.42, y - r * 0.12, r * 0.84, r * 0.12)
}

function drawCrown(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.65
  ctx.fillStyle = "#fbbf24"
  ctx.strokeStyle = "#b45309"
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-r * 0.65, y + r * 0.25)
  ctx.lineTo(-r * 0.65, y - r * 0.15)
  ctx.lineTo(-r * 0.35, y + r * 0.05)
  ctx.lineTo(0, y - r * 0.45)
  ctx.lineTo(r * 0.35, y + r * 0.05)
  ctx.lineTo(r * 0.65, y - r * 0.15)
  ctx.lineTo(r * 0.65, y + r * 0.25)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = "#ef4444"
  ctx.beginPath()
  ctx.arc(0, y - r * 0.2, r * 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#3b82f6"
  ctx.beginPath()
  ctx.arc(-r * 0.32, y + r * 0.05, r * 0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(r * 0.32, y + r * 0.05, r * 0.08, 0, Math.PI * 2)
  ctx.fill()
}

function drawWizard(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.7
  ctx.fillStyle = "#6d28d9"
  ctx.beginPath()
  ctx.moveTo(0, y - r * 1.2)
  ctx.lineTo(-r * 0.65, y + r * 0.15)
  ctx.lineTo(r * 0.65, y + r * 0.15)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = "#fbbf24"
  ctx.beginPath()
  ctx.moveTo(0, y - r * 0.55)
  ctx.lineTo(-r * 0.12, y - r * 0.25)
  ctx.lineTo(r * 0.12, y - r * 0.25)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = "#4c1d95"
  ctx.beginPath()
  ctx.ellipse(0, y + r * 0.12, r * 0.72, r * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawSanta(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.55
  ctx.fillStyle = "#dc2626"
  ctx.beginPath()
  ctx.moveTo(-r * 0.55, y + r * 0.1)
  ctx.quadraticCurveTo(r * 0.1, y - r * 0.9, r * 0.75, y - r * 0.35)
  ctx.quadraticCurveTo(r * 0.2, y - r * 0.15, r * 0.55, y + r * 0.15)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = "#f8fafc"
  ctx.fillRect(-r * 0.6, y, r * 1.15, r * 0.22)
  ctx.beginPath()
  ctx.arc(r * 0.75, y - r * 0.35, r * 0.16, 0, Math.PI * 2)
  ctx.fill()
}

function drawFlower(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.95
  const petals = 6
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2
    ctx.fillStyle = i % 2 === 0 ? "#fb7185" : "#f472b6"
    ctx.beginPath()
    ctx.ellipse(
      Math.cos(a) * r * 0.32,
      y + Math.sin(a) * r * 0.32,
      r * 0.22,
      r * 0.16,
      a,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.fillStyle = "#fde047"
  ctx.beginPath()
  ctx.arc(0, y, r * 0.18, 0, Math.PI * 2)
  ctx.fill()
}

function drawDuck(ctx: CanvasRenderingContext2D, r: number): void {
  const y = -r * 0.85
  ctx.fillStyle = "#facc15"
  ctx.beginPath()
  ctx.ellipse(0, y, r * 0.55, r * 0.45, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(r * 0.35, y - r * 0.15, r * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#f97316"
  ctx.beginPath()
  ctx.ellipse(r * 0.55, y - r * 0.1, r * 0.22, r * 0.1, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#1e293b"
  ctx.beginPath()
  ctx.arc(r * 0.4, y - r * 0.22, r * 0.06, 0, Math.PI * 2)
  ctx.fill()
}

function drawHalo(ctx: CanvasRenderingContext2D, r: number, time: number): void {
  const y = -r * 1.15
  const pulse = 0.85 + Math.sin(time * 4) * 0.15
  ctx.save()
  ctx.globalAlpha = pulse
  ctx.strokeStyle = "#fde047"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(0, y, r * 0.65, r * 0.18, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = "rgba(253, 224, 71, 0.45)"
  ctx.lineWidth = 6
  ctx.stroke()
  ctx.restore()
}
