import { describe, expect, it } from "vitest"
import {
  GAMES,
  WHEEL_SEGMENTS,
  countMatches,
  formatNumbers,
  gameCost,
  getGame,
  minWinningMatches,
  minskDayKey,
  nextMinskMidnight,
  parseNumbers,
  pickWeighted,
  playInstant,
  prizeFor,
  randomNumbers,
  topPrize,
  validateNumbers,
} from "@/lib/lottery"

function sequence(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

const keno = getGame("keno")!
const five = getGame("five")!

describe("games", () => {
  it("each game has a top prize for guessing every number", () => {
    for (const g of GAMES) expect(topPrize(g)).toBeGreaterThan(0)
  })

  it("looks games up by id or name", () => {
    expect(getGame("Пятёрочка")?.id).toBe("five")
    expect(gameCost("super")).toBe(3)
    expect(gameCost("nope")).toBeNull()
  })

  it("pays per game table and nothing below the minimum", () => {
    expect(prizeFor(five, 5)).toBe(50000)
    expect(prizeFor(five, 1)).toBe(0)
    expect(minWinningMatches(keno)).toBe(2)
  })
})

describe("validateNumbers", () => {
  it("accepts a valid pick and sorts it", () => {
    expect(validateNumbers(keno, [7, 1, 20, 3])).toEqual([1, 3, 7, 20])
  })

  it("rejects wrong size, duplicates and out-of-range values", () => {
    expect(validateNumbers(keno, [1, 2, 3])).toBeNull()
    expect(validateNumbers(keno, [1, 1, 2, 3])).toBeNull()
    expect(validateNumbers(keno, [0, 1, 2, 3])).toBeNull()
    expect(validateNumbers(keno, [1, 2, 3, 21])).toBeNull()
    expect(validateNumbers(keno, "1,2,3,4")).toBeNull()
  })
})

describe("playInstant", () => {
  it("draws a winning combination and settles the prize", () => {
    // rng 0, 0.05, 0.1, 0.15 → 1, 2, 3, 4 on a 1..20 range
    const outcome = playInstant(keno, [1, 2, 3, 4], sequence([0, 0.05, 0.1, 0.15]))
    expect(outcome.winning).toEqual([1, 2, 3, 4])
    expect(outcome.matches).toBe(4)
    expect(outcome.prize).toBe(1000)
  })

  it("returns zero prize on a miss", () => {
    const outcome = playInstant(keno, [17, 18, 19, 20], sequence([0, 0.05, 0.1, 0.15]))
    expect(outcome.matches).toBe(0)
    expect(outcome.prize).toBe(0)
  })
})

describe("helpers", () => {
  it("random numbers are distinct and in range", () => {
    const n = randomNumbers(6, 45)
    expect(new Set(n).size).toBe(6)
    expect(n.every((x) => x >= 1 && x <= 45)).toBe(true)
  })

  it("counts matches and round-trips number strings", () => {
    expect(countMatches([1, 2, 3], [3, 4, 1])).toBe(2)
    expect(parseNumbers(formatNumbers([4, 8, 15]))).toEqual([4, 8, 15])
  })

  it("picks weighted wheel segments within bounds", () => {
    expect(pickWeighted(WHEEL_SEGMENTS, () => 0)).toBe(0)
    expect(pickWeighted(WHEEL_SEGMENTS, () => 0.9999)).toBe(WHEEL_SEGMENTS.length - 1)
  })

  it("computes Minsk day and next midnight", () => {
    const at = new Date("2026-04-10T22:30:00Z") // 01:30 on the 11th in Minsk
    expect(minskDayKey(at)).toBe("2026-04-11")
    expect(nextMinskMidnight(at).toISOString()).toBe("2026-04-11T21:00:00.000Z")
  })
})
