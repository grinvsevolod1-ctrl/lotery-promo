import { describe, expect, it } from "vitest"
import { GAMES, playInstant } from "@/lib/lottery"
import { seededRng } from "@/lib/random"
import { LUCK_GAME_ROWS, LUCK_LEVELS, bestOf, expectedReturnBestOf, isLuckAttempts, normalizeLuck } from "@/lib/luck"

const keno = GAMES[0]
const picked = Array.from({ length: keno.pick }, (_, i) => i + 1)

describe("luck boost", () => {
  it("level 1 reproduces the unboosted round", () => {
    const plain = playInstant(keno, picked, seededRng("seed-a"))
    const boosted = bestOf(1, seededRng("seed-a"), (r) => playInstant(keno, picked, r), (o) => o.prize)
    expect(boosted).toEqual(plain)
  })

  it("is reproducible from the seed and level", () => {
    const run = () => bestOf(5, seededRng("seed-b"), (r) => playInstant(keno, picked, r), (o) => o.prize)
    expect(run()).toEqual(run())
  })

  it("picks the highest score, first on ties", () => {
    const values = [3, 7, 7, 1]
    let i = 0
    const result = bestOf(4, () => 0, () => ({ v: values[i], idx: i++ }), (o) => o.v)
    expect(result).toEqual({ v: 7, idx: 1 })
  })

  it("expected return grows with the level for every game", () => {
    for (const row of LUCK_GAME_ROWS) {
      let previous = -Infinity
      for (const level of LUCK_LEVELS) {
        const value = expectedReturnBestOf(row.distribution, level.attempts)
        expect(value).toBeGreaterThanOrEqual(previous)
        previous = value
      }
    }
  })

  it("matches a simple closed form", () => {
    const coin = [{ value: 0, p: 0.5 }, { value: 1, p: 0.5 }]
    expect(expectedReturnBestOf(coin, 1)).toBeCloseTo(0.5)
    expect(expectedReturnBestOf(coin, 2)).toBeCloseTo(0.75)
  })

  it("validates levels", () => {
    expect(isLuckAttempts(5)).toBe(true)
    expect(isLuckAttempts(4)).toBe(false)
    expect(normalizeLuck("abc")).toBe(1)
  })
})
