import "./style.css"
import { BotController } from "./game/BotController"
import { CanvasRecorder } from "./game/CanvasRecorder"
import { configFromSearch } from "./game/config"
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
