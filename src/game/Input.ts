import type { PointerState } from "./types"

export class Input {
  pointer: PointerState = {
    down: false,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    id: null,
  }

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
        if (this.pointer.down) return
        el.setPointerCapture(e.pointerId)
        const { x, y } = this.clientToCanvas(e.clientX, e.clientY)
        this.pointer = {
          down: true,
          x,
          y,
          startX: x,
          startY: y,
          id: e.pointerId,
        }
        e.preventDefault()
      },
      { passive: false },
    )

    el.addEventListener(
      "pointermove",
      (e) => {
        if (!this.pointer.down || e.pointerId !== this.pointer.id) return
        const { x, y } = this.clientToCanvas(e.clientX, e.clientY)
        this.pointer.x = x
        this.pointer.y = y
        e.preventDefault()
      },
      { passive: false },
    )

    const end = (e: PointerEvent) => {
      if (!this.pointer.down || e.pointerId !== this.pointer.id) return
      const { x, y } = this.clientToCanvas(e.clientX, e.clientY)
      this.pointer.x = x
      this.pointer.y = y
      this.pointer.down = false
      this.pointer.id = null
      e.preventDefault()
    }

    el.addEventListener("pointerup", end, { passive: false })
    el.addEventListener("pointercancel", end, { passive: false })
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
