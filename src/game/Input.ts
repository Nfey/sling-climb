import type { PointerState, Vec2 } from "./types"

/**
 * Multi-touch pointer tracker (single-finger control used by gameplay)
 * plus WASD keyboard state for desktop slingshot movement.
 */
export class Input {
  /** Active pointers keyed by pointerId. */
  pointers = new Map<number, PointerState>()
  /** Pointers that went down since last consumePresses(). */
  private pressedQueue: PointerState[] = []
  /** Pointer ids that went up since last consumeReleases(). */
  private releasedQueue: number[] = []
  /** Currently held WASD keys (normalized lowercase). */
  private keys = new Set<string>()

  private canvas: HTMLCanvasElement
  /** Called synchronously inside pointer/key gestures (e.g. audio unlock). */
  private onUserGesture: (() => void) | null
  private onKeyDown = (e: KeyboardEvent): void => {
    const key = normalizeMoveKey(e.key)
    if (!key) return
    this.onUserGesture?.()
    this.keys.add(key)
    e.preventDefault()
  }
  private onKeyUp = (e: KeyboardEvent): void => {
    const key = normalizeMoveKey(e.key)
    if (!key) return
    this.keys.delete(key)
    e.preventDefault()
  }
  private onBlur = (): void => {
    this.keys.clear()
  }

  constructor(canvas: HTMLCanvasElement, onUserGesture?: () => void) {
    this.canvas = canvas
    this.onUserGesture = onUserGesture ?? null
    this.bind()
  }

  private bind(): void {
    const el = this.canvas

    el.addEventListener(
      "pointerdown",
      (e) => {
        // Resume AudioContext in the gesture stack — not in rAF.
        this.onUserGesture?.()
        el.setPointerCapture(e.pointerId)
        const { x, y } = this.clientToCanvas(e.clientX, e.clientY)
        const state: PointerState = {
          down: true,
          x,
          y,
          startX: x,
          startY: y,
          id: e.pointerId,
        }
        this.pointers.set(e.pointerId, state)
        this.pressedQueue.push({ ...state })
        e.preventDefault()
      },
      { passive: false },
    )

    el.addEventListener(
      "pointermove",
      (e) => {
        const p = this.pointers.get(e.pointerId)
        if (!p) return
        const { x, y } = this.clientToCanvas(e.clientX, e.clientY)
        p.x = x
        p.y = y
        e.preventDefault()
      },
      { passive: false },
    )

    const end = (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId)
      if (!p) return
      // Release-to-fire is also a gesture — unlock again so launch SFX can play.
      this.onUserGesture?.()
      const { x, y } = this.clientToCanvas(e.clientX, e.clientY)
      p.x = x
      p.y = y
      p.down = false
      this.pointers.delete(e.pointerId)
      this.releasedQueue.push(e.pointerId)
      e.preventDefault()
    }

    el.addEventListener("pointerup", end, { passive: false })
    el.addEventListener("pointercancel", end, { passive: false })

    window.addEventListener("keydown", this.onKeyDown)
    window.addEventListener("keyup", this.onKeyUp)
    window.addEventListener("blur", this.onBlur)
  }

  consumePresses(): PointerState[] {
    const presses = this.pressedQueue
    this.pressedQueue = []
    return presses
  }

  consumeReleases(): number[] {
    const releases = this.releasedQueue
    this.releasedQueue = []
    return releases
  }

  getPointer(id: number): PointerState | undefined {
    return this.pointers.get(id)
  }

  activePointers(): PointerState[] {
    return [...this.pointers.values()]
  }

  /** True when any WASD key is held. */
  get hasKeyboardMove(): boolean {
    return this.keys.size > 0
  }

  /**
   * Unit-ish WASD vector in world space (Y up): A/D → x, W/S → y.
   * Diagonal input is normalized so speed stays consistent.
   */
  keyboardMove(): Vec2 {
    let x = 0
    let y = 0
    if (this.keys.has("a")) x -= 1
    if (this.keys.has("d")) x += 1
    if (this.keys.has("w")) y += 1
    if (this.keys.has("s")) y -= 1
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    return { x, y }
  }

  /**
   * Return CSS-pixel coordinates to match Camera / game logic.
   * Do not multiply by devicePixelRatio — canvas backing store is scaled
   * separately in the renderer via ctx.setTransform(dpr, ...).
   */
  private clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }
}

function normalizeMoveKey(key: string): string | null {
  const k = key.toLowerCase()
  if (k === "w" || k === "a" || k === "s" || k === "d") return k
  if (k === "arrowup") return "w"
  if (k === "arrowleft") return "a"
  if (k === "arrowdown") return "s"
  if (k === "arrowright") return "d"
  return null
}
