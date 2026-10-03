export type GameMode = "normal" | "playable" | "bot"
/** Base bots plus seek variants that prefer full pulls and aim at hazards. */
export type BotStyle = "perfect" | "human" | "perfect-seek" | "human-seek"

const BOT_STYLES: readonly BotStyle[] = [
  "perfect",
  "human",
  "perfect-seek",
  "human-seek",
]

export function isBotStyle(value: string | null): value is BotStyle {
  return value != null && (BOT_STYLES as readonly string[]).includes(value)
}

export interface GameConfig {
  mode: GameMode
  botStyle?: BotStyle
  record?: boolean
  /** Store / install URL for playable CTA. */
  installUrl?: string
  /** Playable session length before forced end (seconds). */
  maxSessionSec?: number
  persistScores?: boolean
  autoRestart?: boolean
  /** Called when a playable session ends (game over or timer). */
  onSessionEnd?: () => void
  /**
   * Sunbaked Canyon sprites. Default on. `?art=0` keeps the code-drawn look.
   */
  spriteArt: boolean
  /**
   * `?debug=1` only. Session never writes localStorage.
   * `best` seeds the BEST / milestone lines; `climb` places the slingshot.
   */
  debug: boolean
  debugBest?: number
  debugClimb?: number
}

/** Default for {@link GameConfig.spriteArt}. Tests can import this. */
export const SPRITE_ART_DEFAULT = true

export const DEFAULT_INSTALL_URL = "#"

export function defaultConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  const mode = overrides.mode ?? "normal"
  return {
    mode,
    botStyle: overrides.botStyle,
    record: overrides.record ?? false,
    installUrl: overrides.installUrl ?? DEFAULT_INSTALL_URL,
    maxSessionSec: overrides.maxSessionSec ?? (mode === "playable" ? 30 : undefined),
    persistScores: overrides.persistScores ?? mode === "normal",
    autoRestart: overrides.autoRestart ?? mode === "bot",
    onSessionEnd: overrides.onSessionEnd,
    spriteArt: overrides.spriteArt ?? SPRITE_ART_DEFAULT,
    debug: overrides.debug ?? false,
    debugBest: overrides.debugBest,
    debugClimb: overrides.debugClimb,
  }
}

function parseDebugNumber(raw: string | null): number | undefined {
  if (raw == null || raw.trim() === "") return undefined
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
}

/** Parse main-game query params (`?bot=human&record=1`, `?art=0`, `?debug=1`). */
export function configFromSearch(search = window.location.search): GameConfig {
  const params = new URLSearchParams(search)
  const bot = params.get("bot")
  const record = params.get("record") === "1" || params.get("record") === "true"
  const installUrl = params.get("installUrl") ?? undefined
  const art = params.get("art")
  const spriteArt = art !== "0" && art !== "false"
  const debug = params.get("debug") === "1"
  const debugBest = debug ? parseDebugNumber(params.get("best")) : undefined
  const debugClimb = debug ? parseDebugNumber(params.get("climb")) : undefined

  if (isBotStyle(bot)) {
    return defaultConfig({
      mode: "bot",
      botStyle: bot,
      record,
      installUrl,
      persistScores: false,
      autoRestart: true,
      spriteArt,
      debug,
      debugBest,
      debugClimb,
    })
  }

  return defaultConfig({
    record,
    installUrl,
    spriteArt,
    debug,
    debugBest,
    debugClimb,
    persistScores: debug ? false : undefined,
  })
}
