import {
  PLATFORM_HEIGHT,
  PLATFORM_HORIZONTAL_MARGIN,
  PLATFORM_MAX_WIDTH,
  PLATFORM_MIN_WIDTH,
  PLATFORM_VERTICAL_GAP_MAX,
  PLATFORM_VERTICAL_GAP_MIN,
} from "./constants"
import type { PlatformData } from "./types"

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export class PlatformManager {
  platforms: PlatformData[] = []
  private nextY = 0
  private worldWidth = 390

  reset(worldWidth: number, slingshotY: number): void {
    this.worldWidth = worldWidth
    this.platforms = []
    // First platform near / just above starting area for an easy first bounce
    this.nextY = slingshotY + 80
    this.spawnInitial(slingshotY)
  }

  private spawnInitial(slingshotY: number): void {
    // A starter platform slightly above the slingshot so early shots can land
    this.platforms.push({
      x: this.worldWidth * 0.5 - 50,
      y: slingshotY + 100,
      width: 100,
      height: PLATFORM_HEIGHT,
    })
    this.nextY = slingshotY + 100 + rand(PLATFORM_VERTICAL_GAP_MIN, PLATFORM_VERTICAL_GAP_MAX)

    while (this.nextY < slingshotY + 1400) {
      this.spawnOne()
    }
  }

  private spawnOne(): void {
    const width = rand(PLATFORM_MIN_WIDTH, PLATFORM_MAX_WIDTH)
    const maxX = Math.max(
      PLATFORM_HORIZONTAL_MARGIN,
      this.worldWidth - width - PLATFORM_HORIZONTAL_MARGIN,
    )
    const x = rand(PLATFORM_HORIZONTAL_MARGIN, maxX)
    this.platforms.push({
      x,
      y: this.nextY,
      width,
      height: PLATFORM_HEIGHT,
    })
    this.nextY += rand(PLATFORM_VERTICAL_GAP_MIN, PLATFORM_VERTICAL_GAP_MAX)
  }

  /** Generate platforms ahead of the camera and cull far below. */
  update(cameraY: number, viewHeight: number): void {
    const topNeeded = cameraY + viewHeight * 1.5
    while (this.nextY < topNeeded) {
      this.spawnOne()
    }

    const cullBelow = cameraY - viewHeight
    this.platforms = this.platforms.filter((p) => p.y + p.height > cullBelow)
  }
}
