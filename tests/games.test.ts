import { describe, expect, it } from "vitest"
import {
  PLINKO_MAX_ROWS,
  PLINKO_MIN_ROWS,
  PLINKO_RISKS,
  playPlinko,
  plinkoExpectedReturn,
  plinkoMultipliers,
  plinkoPayout,
} from "@/lib/games/plinko"
import { SCRATCH_FIELDS, SCRATCH_PRICES, largestGroup, playScratch, scratchExpectedReturn } from "@/lib/games/scratch"
import { seededRng } from "@/lib/random"

describe("plinko", () => {
  it("has a symmetric table with rows + 1 slots and an edge under 100%", () => {
    for (let rows = PLINKO_MIN_ROWS; rows <= PLINKO_MAX_ROWS; rows++) {
      for (const { id } of PLINKO_RISKS) {
        const table = plinkoMultipliers(rows, id)
        expect(table).toHaveLength(rows + 1)
        expect([...table].reverse()).toEqual([...table])
        expect(plinkoExpectedReturn(rows, id)).toBeLessThan(1)
      }
    }
  })

  it("lands in the slot equal to the number of right bounces", () => {
    const rng = seededRng("plinko")
    for (let i = 0; i < 200; i++) {
      const out = playPlinko(10, 12, "medium", rng)
      expect(out.path).toHaveLength(12)
      expect(out.slot).toBe(out.path.filter((s) => s === 1).length)
      expect(out.multiplier).toBe(plinkoMultipliers(12, "medium")[out.slot])
      expect(out.payout).toBe(plinkoPayout(10, out.multiplier))
    }
  })

  it("pays whole BYN, rounding down", () => {
    expect(plinkoPayout(1, 0.5)).toBe(0)
    expect(plinkoPayout(3, 1.1)).toBe(3)
    expect(plinkoPayout(10, 1.1)).toBe(11)
    expect(plinkoPayout(7, 5.6)).toBe(39)
  })
})

describe("scratch", () => {
  it("returns less than the ticket price on average", () => {
    expect(scratchExpectedReturn()).toBeCloseTo(0.95, 5)
  })

  it("never shows a bigger group than it pays for", () => {
    const rng = seededRng("scratch")
    for (let i = 0; i < 2000; i++) {
      const price = SCRATCH_PRICES[i % SCRATCH_PRICES.length]
      const out = playScratch(price, rng)
      expect(out.fields).toHaveLength(SCRATCH_FIELDS)
      const group = largestGroup(out.fields)
      if (out.matches === 0) {
        expect(group.count).toBeLessThanOrEqual(2)
        expect(out.prize).toBe(0)
      } else {
        expect(group.count).toBe(out.matches)
        expect(group.symbol).toBe(out.winningSymbol)
        expect(out.prize).toBe(price * out.multiplier)
      }
    }
  })
})
