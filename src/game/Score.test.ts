import { describe, expect, it } from "vitest"
import { BONUS_PLATFORM_POINTS, CLIMB_POINT_UNIT, COIN_VALUE } from "./constants"
import { Score } from "./Score"

function newRun(startY = 0): Score {
  const score = new Score(false)
  score.reset(startY)
  return score
}

describe("Score climb points", () => {
  it("banks one point per climb unit at combo 1", () => {
    const score = newRun()
    score.observe(CLIMB_POINT_UNIT * 3)
    expect(score.heightPoints).toBe(3)
    expect(score.climbHeight).toBe(CLIMB_POINT_UNIT * 3)
  })

  it("applies the combo at the time distance is gained", () => {
    const score = newRun()
    score.observe(CLIMB_POINT_UNIT * 2)
    score.bumpCombo()
    score.observe(CLIMB_POINT_UNIT * 4)
    expect(score.heightPoints).toBe(2 + 2 * 2)
  })

  it("ignores a ball that is not above the peak", () => {
    const score = newRun()
    score.observe(CLIMB_POINT_UNIT * 2)
    score.observe(CLIMB_POINT_UNIT)
    expect(score.heightPoints).toBe(2)
    expect(score.peakHeight).toBe(CLIMB_POINT_UNIT * 2)
  })

  it("measures climb from the run start height", () => {
    const score = newRun(500)
    score.observe(500 + CLIMB_POINT_UNIT)
    expect(score.climbHeight).toBe(CLIMB_POINT_UNIT)
    expect(score.heightPoints).toBe(1)
  })
})

describe("Score bonuses and combo", () => {
  it("multiplies platform bonuses by the combo and resets it", () => {
    const score = newRun()
    score.bumpCombo()
    expect(score.collectBonus()).toBe(BONUS_PLATFORM_POINTS * 2)
    score.resetCombo()
    expect(score.combo).toBe(1)
    expect(score.collectBonus()).toBe(BONUS_PLATFORM_POINTS)
  })

  it("collectFlat ignores the combo", () => {
    const score = newRun()
    score.bumpCombo()
    score.bumpCombo()
    expect(score.collectFlat(7)).toBe(7)
    expect(score.current).toBe(7)
  })
})

describe("Score best-run tracking", () => {
  it("commitHighScore flags and stores a new best score and height", () => {
    const score = newRun()
    score.observe(CLIMB_POINT_UNIT * 5)
    expect(score.commitHighScore()).toBe(true)
    expect(score.isNewHighScore).toBe(true)
    expect(score.isNewBestHeight).toBe(true)
    expect(score.highScore).toBe(5)
    expect(score.bestMaxHeight).toBe(CLIMB_POINT_UNIT * 5)
  })

  it("does not flag a worse run", () => {
    const score = newRun()
    score.observe(CLIMB_POINT_UNIT * 5)
    score.commitHighScore()
    score.reset(0)
    score.observe(CLIMB_POINT_UNIT)
    expect(score.commitHighScore()).toBe(false)
    expect(score.isNewBestHeight).toBe(false)
    expect(score.highScore).toBe(5)
  })

  it("freezes the height line at run start and flags when it is passed", () => {
    const score = newRun()
    score.observe(CLIMB_POINT_UNIT * 4)
    score.commitHighScore()
    score.reset(100)
    expect(score.runHeightLine).toBe(CLIMB_POINT_UNIT * 4)
    expect(score.heightLineWorldY).toBe(100 + CLIMB_POINT_UNIT * 4)
    expect(score.heightLinePassed).toBe(false)
    score.observe(100 + CLIMB_POINT_UNIT * 4)
    expect(score.heightLinePassed).toBe(true)
    expect(score.runHeightLine).toBe(CLIMB_POINT_UNIT * 4)
  })

  it("has no milestone lines before a best height exists", () => {
    expect(newRun().milestoneLines).toEqual([])
  })

  it("lists 2x to 10x milestones and marks the passed ones", () => {
    const score = newRun()
    score.observe(CLIMB_POINT_UNIT * 4)
    score.commitHighScore()
    score.reset(0)
    score.observe(CLIMB_POINT_UNIT * 8)
    const lines = score.milestoneLines
    expect(lines).toHaveLength(9)
    expect(lines[0]).toMatchObject({ label: "2× BEST", passed: true, colorIndex: 0 })
    expect(lines[1].passed).toBe(false)
  })
})

describe("Score coins", () => {
  it("adds coins at COIN_VALUE each and spends only when affordable", () => {
    const score = newRun()
    expect(score.addCoins(3)).toBe(3 * COIN_VALUE)
    expect(score.addCoins(0)).toBe(0)
    expect(score.spendCoins(3 * COIN_VALUE + 1)).toBe(false)
    expect(score.spendCoins(COIN_VALUE)).toBe(true)
    expect(score.lifetimeCoins).toBe(2 * COIN_VALUE)
  })

  it("banks lifetime climb only for new distance", () => {
    const score = newRun()
    score.bankClimb(100)
    score.bankClimb(100)
    score.bankClimb(150)
    expect(score.lifetimeClimbed).toBe(150)
  })
})
