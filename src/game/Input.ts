import type { PointerState } from "./types"

/**
 * Multi-touch pointer tracker. Supports simultaneous fingers for dual slingshots.
 */
export class Input {
  /** Active pointers keyed by pointerId. */
  pointers = new Map<number, PointerState>()
  /** Pointers that went down since last consumePresses(). */
  private pressedQueue: PointerState[] = []
  /** Pointer ids that went up since last consumeReleases(). */
  private releasedQueue: number[] = []

  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.bind()
  }

  private bind(): void {
    const el = this.canvas

    el.addEventListener(
      "pointerdown",
      (e) => {
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
