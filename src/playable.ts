import "./style.css"
import "./playable/cta.css"
import { defaultConfig } from "./game/config"
import { Game } from "./game/Game"
import { openStore } from "./playable/install"

const canvas = document.querySelector<HTMLCanvasElement>("#game")
const ctaEl = document.querySelector<HTMLElement>("#install-cta")
if (!canvas) throw new Error("Missing #game canvas")
if (!ctaEl) throw new Error("Missing #install-cta")
const cta = ctaEl

const params = new URLSearchParams(window.location.search)
const installUrl = params.get("installUrl") ?? undefined

function showCta(): void {
  cta.classList.add("is-visible")
}

function onInstall(e: Event): void {
  e.preventDefault()
  openStore(installUrl)
}

cta.addEventListener("click", onInstall)
cta.querySelector("[data-install]")?.addEventListener("click", onInstall)

const game = new Game(
  canvas,
  defaultConfig({
    mode: "playable",
    persistScores: false,
    autoRestart: false,
    maxSessionSec: 30,
    installUrl,
    onSessionEnd: showCta,
  }),
)

game.start()
