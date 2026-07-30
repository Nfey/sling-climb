import { DEFAULT_INSTALL_URL } from "../game/config"

declare global {
  interface Window {
    clickTag?: string
    mraid?: {
      open: (url: string) => void
      getState?: () => string
      addEventListener?: (event: string, cb: () => void) => void
    }
  }
}

/**
 * Network-agnostic install / store open for HTML5 playables.
 * Tries MRAID → clickTag → window.open.
 */
export function openStore(url = DEFAULT_INSTALL_URL): void {
  const target =
    (typeof window.clickTag === "string" && window.clickTag) || url || DEFAULT_INSTALL_URL

  try {
    if (window.mraid && typeof window.mraid.open === "function") {
      window.mraid.open(target)
      return
    }
  } catch {
    // fall through
  }

  try {
    window.open(target, "_blank")
  } catch {
    window.location.href = target
  }
}
