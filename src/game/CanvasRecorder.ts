/**
 * Records the game canvas to a downloadable WebM via MediaRecorder.
 */
export class CanvasRecorder {
  private canvas: HTMLCanvasElement
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null
  private filenamePrefix: string
  private overlay: HTMLDivElement | null = null
  private recording = false

  constructor(canvas: HTMLCanvasElement, filenamePrefix = "sling-climb-bot") {
    this.canvas = canvas
    this.filenamePrefix = filenamePrefix
  }

  get isRecording(): boolean {
    return this.recording
  }

  /** Mount a small start/stop control over the playfield. */
  mountControls(parent: HTMLElement = document.body): void {
    if (this.overlay) return
    const el = document.createElement("div")
    el.id = "bot-recorder"
    el.innerHTML = `
      <button type="button" data-rec="toggle">Record</button>
      <span data-rec="status"></span>
    `
    Object.assign(el.style, {
      position: "fixed",
      top: "calc(12px + env(safe-area-inset-top, 0px))",
      right: "12px",
      zIndex: "40",
      display: "flex",
      gap: "8px",
      alignItems: "center",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
    } as CSSStyleDeclaration)

    const btn = el.querySelector<HTMLButtonElement>("[data-rec=toggle]")!
    Object.assign(btn.style, {
      appearance: "none",
      border: "none",
      borderRadius: "8px",
      padding: "8px 12px",
      background: "#111",
      color: "#fff",
      fontWeight: "700",
      cursor: "pointer",
    } as CSSStyleDeclaration)

    btn.addEventListener("click", () => {
      if (this.recording) this.stop()
      else this.start()
      this.syncUi()
    })

    parent.appendChild(el)
    this.overlay = el
    this.syncUi()
  }

  start(): void {
    if (this.recording) return
    if (typeof MediaRecorder === "undefined" || !this.canvas.captureStream) {
      console.warn("Canvas recording is not supported in this browser.")
      return
    }

    this.chunks = []
    this.stream = this.canvas.captureStream(60)
    const mime = pickMimeType()
    try {
      this.recorder = mime
        ? new MediaRecorder(this.stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 })
        : new MediaRecorder(this.stream, { videoBitsPerSecond: 6_000_000 })
    } catch {
      this.recorder = new MediaRecorder(this.stream)
    }

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.onstop = () => this.download()
    this.recorder.start(250)
    this.recording = true
    this.syncUi()
  }

  stop(): void {
    if (!this.recording || !this.recorder) return
    this.recording = false
    if (this.recorder.state !== "inactive") this.recorder.stop()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.recorder = null
    this.syncUi()
  }

  destroy(): void {
    if (this.recording) this.stop()
    this.overlay?.remove()
    this.overlay = null
  }

  private download(): void {
    if (this.chunks.length === 0) return
    const type = this.chunks[0]?.type || "video/webm"
    const blob = new Blob(this.chunks, { type })
    this.chunks = []
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    a.href = url
    a.download = `${this.filenamePrefix}-${stamp}.webm`
    a.click()
    URL.revokeObjectURL(url)
  }

  private syncUi(): void {
    if (!this.overlay) return
    const btn = this.overlay.querySelector<HTMLButtonElement>("[data-rec=toggle]")
    const status = this.overlay.querySelector<HTMLSpanElement>("[data-rec=status]")
    if (btn) {
      btn.textContent = this.recording ? "Stop & save" : "Record"
      btn.style.background = this.recording ? "#c0392b" : "#111"
    }
    if (status) {
      status.textContent = this.recording ? "Recording…" : ""
      status.style.color = "#c0392b"
      status.style.fontWeight = "700"
    }
  }
}

function pickMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c
  }
  return undefined
}
