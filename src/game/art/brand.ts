import logoDark1xUrl from "../../assets/brand/sling-bounce/sling-bounce_stacked-subtitle_dark@1x.png"
import logoDark2xUrl from "../../assets/brand/sling-bounce/sling-bounce_stacked-subtitle_dark@2x.png"
import logoLight1xUrl from "../../assets/brand/sling-bounce/sling-bounce_stacked-subtitle_light@1x.png"
import logoLight2xUrl from "../../assets/brand/sling-bounce/sling-bounce_stacked-subtitle_light@2x.png"
import { inkIsLight } from "./palette"

/**
 * Stacked-subtitle lockup. The PNG already includes the ™.
 * `_light` is the lockup for light themes; `_dark` is for dark themes.
 * Wordmark is Lilita One (Juan Montoreano, SIL OFL 1.1), converted to
 * outlines — no font file is shipped.
 */

function load(url: string): HTMLImageElement {
  const img = new Image()
  img.src = url
  return img
}

const logoLight1x = load(logoLight1xUrl)
const logoLight2x = load(logoLight2xUrl)
const logoDark1x = load(logoDark1xUrl)
const logoDark2x = load(logoDark2xUrl)

const logos = [logoLight1x, logoLight2x, logoDark1x, logoDark2x]

export function preloadLogos(): Promise<void> {
  return Promise.all(
    logos.map(
      (img) =>
        new Promise<void>((resolve) => {
          const done = () => {
            img.decode().then(
              () => resolve(),
              () => resolve(),
            )
          }
          if (img.complete && img.naturalWidth > 0) {
            done()
            return
          }
          img.onload = () => done()
          img.onerror = () => resolve()
        }),
    ),
  ).then(() => undefined)
}

export function logosReady(): boolean {
  return logos.every((img) => img.complete && img.naturalWidth > 0)
}

/** Light lockup on light themes, dark lockup on dark themes. @2x when dpr > 1. */
export function logoForTheme(dpr: number, ink: string): HTMLImageElement | null {
  if (!logosReady()) return null
  const darkTheme = inkIsLight(ink)
  const hi = dpr > 1
  if (darkTheme) return hi ? logoDark2x : logoDark1x
  return hi ? logoLight2x : logoLight1x
}
