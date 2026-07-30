export type GameMode = "normal" | "playable" | "bot"
export type BotStyle = "perfect" | "human"

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
}

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
  }
}

/** Parse main-game query params (`?bot=human&record=1`). */
export function configFromSearch(search = window.location.search): GameConfig {
  const params = new URLSearchParams(search)
  const bot = params.get("bot")
  const record = params.get("record") === "1" || params.get("record") === "true"
  const installUrl = params.get("installUrl") ?? undefined

  if (bot === "perfect" || bot === "human") {
    return defaultConfig({
      mode: "bot",
      botStyle: bot,
      record,
      installUrl,
      persistScores: false,
      autoRestart: true,
    })
  }

  return defaultConfig({ record, installUrl })
}
