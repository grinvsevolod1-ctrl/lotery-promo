import { describe, expect, it } from "vitest"
import {
  NINJA_CELLS,
  NINJA_HOUSE,
  NINJA_MAX_MULTIPLIER,
  NINJA_MAX_TRAPS,
  NINJA_MIN_TRAPS,
  NINJA_RANKS,
  awakeningCost,
  cashoutNinja,
  createNinjaLayout,
  initialNinjaState,
  ninjaExpectedReturn,
  ninjaLadder,
  ninjaPayout,
  revealNinjaCell,
} from "@/lib/games/ninja"
import { seededRng } from "@/lib/random"

describe("ninja ladder", () => {
  it("grows monotonically and starts at the house edge", () => {
    for (let traps = NINJA_MIN_TRAPS; traps <= NINJA_MAX_TRAPS; traps++) {
      const ladder = ninjaLadder(traps)
      expect(ladder[0]).toBe(NINJA_HOUSE)
      for (let k = 1; k < ladder.length; k++) expect(ladder[k]).toBeGreaterThan(ladder[k - 1])
      expect(ladder[ladder.length - 1]).toBeLessThanOrEqual(NINJA_MAX_MULTIPLIER)
    }
  })

  it("returns at most 95% for every stop-after-k strategy", () => {
    for (let traps = NINJA_MIN_TRAPS; traps <= NINJA_MAX_TRAPS; traps++) {
      const ladder = ninjaLadder(traps)
      for (let target = 1; target < ladder.length; target++) {
        const rtp = ninjaExpectedReturn(traps, target)
        expect(rtp).toBeLessThanOrEqual(NINJA_HOUSE + 1e-9)
        // The payout cap is the only thing allowed to cut the return noticeably.
        if (ladder[target] < NINJA_MAX_MULTIPLIER) expect(rtp).toBeGreaterThan(NINJA_HOUSE - 0.002)
      }
    }
  })

  it("prices the awakening at the value of the state divided by the house edge", () => {
    const ladder = ninjaLadder(5)
    expect(awakeningCost(10, 5, 0)).toBe(10)
    expect(awakeningCost(10, 5, 3)).toBeCloseTo((10 * ladder[3]) / NINJA_HOUSE, 1)
    expect(awakeningCost(1, 10, 6)).toBeGreaterThan(awakeningCost(1, 10, 3))
  })

  it("pays to the kopeck, rounding down", () => {
    expect(ninjaPayout(3, 1.07)).toBe(3.21)
    expect(ninjaPayout(7, 1.2228)).toBe(8.55)
    expect(ninjaPayout(1, 0.98958)).toBe(0.98)
  })
})

describe("ninja round", () => {
  it("lays out the requested number of traps and no Sharingan on pre-opened cells", () => {
    const rng = seededRng("ninja-layout")
    for (let i = 0; i < 100; i++) {
      const traps = NINJA_MIN_TRAPS + (i % NINJA_MAX_TRAPS)
      const { layout, preRevealed } = createNinjaLayout(traps, rng, 3)
      expect(layout.traps).toHaveLength(traps)
      expect(new Set(layout.traps).size).toBe(traps)
      expect(preRevealed).toHaveLength(3)
      for (const cell of preRevealed) {
        expect(layout.traps).not.toContain(cell)
        expect(layout.sharingan).not.toContain(cell)
      }
      for (const cell of layout.sharingan) expect(layout.traps).not.toContain(cell)
      expect([...layout.sealOrder].sort((a, b) => a - b)).toEqual(layout.traps)
    }
  })

  it("busts on a trap and keeps the locked refund", () => {
    const rng = seededRng("ninja-bust")
    const { layout } = createNinjaLayout(3, rng)
    let state = initialNinjaState(3)
    const safe = Array.from({ length: NINJA_CELLS }, (_, i) => i).filter((c) => !layout.traps.includes(c) && !layout.sharingan.includes(c))
    for (const cell of safe.slice(0, 3)) state = revealNinjaCell(state, layout, cell).state
    expect(state.rank).toBe("genin")
    expect(state.refund).toBeGreaterThan(0)
    const refund = state.refund
    const { state: bust, event } = revealNinjaCell(state, layout, layout.traps[0])
    expect(event.type).toBe("bust")
    expect(bust.status).toBe("bust")
    expect(bust.multiplier).toBe(refund)
  })

  it("seals a trap when a Sharingan scroll is opened", () => {
    const rng = seededRng("ninja-sharingan")
    let found = false
    for (let i = 0; i < 50 && !found; i++) {
      const { layout } = createNinjaLayout(4, rng)
      if (layout.sharingan.length === 0) continue
      found = true
      const state = initialNinjaState(4)
      const { state: next, event } = revealNinjaCell(state, layout, layout.sharingan[0])
      expect(event.type === "safe" && event.sharingan).toBe(true)
      expect(next.sealed).toHaveLength(1)
      expect(layout.traps).toContain(next.sealed[0])
      expect(() => revealNinjaCell(next, layout, next.sealed[0])).toThrow()
    }
    expect(found).toBe(true)
  })

  it("completes automatically once only traps remain and refuses to cash out at zero", () => {
    const rng = seededRng("ninja-complete")
    const { layout } = createNinjaLayout(1, rng)
    let state = initialNinjaState(1)
    expect(() => cashoutNinja(state)).toThrow()
    for (let cell = 0; cell < NINJA_CELLS; cell++) {
      if (layout.traps.includes(cell) || state.status !== "active") continue
      if (state.sealed.includes(cell)) continue
      state = revealNinjaCell(state, layout, cell).state
    }
    expect(state.status).toBe("complete")
    expect(state.rank).not.toBeNull()
    // Either the single trap was sealed by a Sharingan or every safe scroll was opened.
    expect(state.sealed.length === 1 || state.revealed.length === NINJA_CELLS - 1).toBe(true)
    expect(NINJA_RANKS.map((r) => r.id)).toContain(state.rank)
  })
})
