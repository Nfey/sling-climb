import "./style.css"
import { BotController } from "./game/BotController"
import { CanvasRecorder } from "./game/CanvasRecorder"
import { configFromSearch } from "./game/config"
import { exportDefaultAppIconPngs } from "./game/appIcon"
import { Game } from "./game/Game"

const canvas = document.querySelector<HTMLCanvasElement>("#game")
if (!canvas) {
  throw new Error("Missing #game canvas")
}

const config = configFromSearch()
const game = new Game(canvas, config)

if (config.mode === "bot") {
  const bot = new BotController(config.botStyle ?? "perfect")
  game.setController(bot)

  const recorder = new CanvasRecorder(
    canvas,
    `sling-climb-bot-${config.botStyle ?? "perfect"}`,
  )
  recorder.mountControls(document.body)
  if (config.record) {
    // Defer so the first frame is painted before capture starts.
    requestAnimationFrame(() => recorder.start())
  }
}

game.start()

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* installability still works without a registered SW in some browsers */
    })
  })
}

/** Dev helper: /?exportIcons=1 downloads default PWA PNGs from the live renderer. */
if (import.meta.env.DEV && new URLSearchParams(location.search).has("exportIcons")) {
  void exportDefaultAppIconPngs().then((files) => {
    for (const [name, blob] of Object.entries(files)) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    }
  })
}

// Exposed for headless icon export scripts.
declare global {
  interface Window {
    __exportDefaultAppIconPngs?: typeof exportDefaultAppIconPngs
  }
}
window.__exportDefaultAppIconPngs = exportDefaultAppIconPngs
