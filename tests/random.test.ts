import { describe, expect, it } from "vitest"
import { secureRng } from "@/lib/random"
import { MAX_NUMBER, NUMBERS_PER_TICKET, WHEEL_SEGMENTS, pickWeighted, randomNumbers } from "@/lib/lottery"

describe("secureRng", () => {
  it("returns values in [0, 1) without throwing", () => {
    for (let i = 0; i < 10_000; i++) {
      const value = secureRng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it("drives a full ticket draw and a wheel spin", () => {
    const numbers = randomNumbers(NUMBERS_PER_TICKET, MAX_NUMBER, secureRng)
    expect(numbers).toHaveLength(NUMBERS_PER_TICKET)
    expect(new Set(numbers).size).toBe(NUMBERS_PER_TICKET)
    expect(numbers.every((n) => n >= 1 && n <= MAX_NUMBER)).toBe(true)

    const segment = pickWeighted(WHEEL_SEGMENTS, secureRng)
    expect(segment).toBeGreaterThanOrEqual(0)
    expect(segment).toBeLessThan(WHEEL_SEGMENTS.length)
  })
})
