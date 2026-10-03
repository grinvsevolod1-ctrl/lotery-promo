import { describe, expect, it } from "vitest"
import {
  DRAW_HOUR_MINSK,
  GAMES,
  MAX_NUMBER,
  MINSK_UTC_OFFSET_MS,
  NUMBERS_PER_TICKET,
  PRIZE_BY_MATCHES,
  WHEEL_SEGMENTS,
  countMatches,
  formatNumbers,
  gameCost,
  minskDayKey,
  nextDrawAt,
  nextMinskMidnight,
  parseNumbers,
  pickWeighted,
  prizeFor,
  randomNumbers,
  validateNumbers,
} from "@/lib/lottery"

/** Deterministic rng that replays the given values in order. */
function sequence(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

describe("prize table", () => {
  it("pays nothing for fewer than 3 matches", () => {
    expect(prizeFor(0)).toBe(0)
    expect(prizeFor(1)).toBe(0)
    expect(prizeFor(2)).toBe(0)
  })

  it("pays the documented amount for 3..6 matches", () => {
    expect(prizeFor(3)).toBe(2)
    expect(prizeFor(4)).toBe(10)
    expect(prizeFor(5)).toBe(100)
    expect(prizeFor(6)).toBe(1000)
  })

  it("grows strictly with the number of matches", () => {
    const tiers = Object.keys(PRIZE_BY_MATCHES)
      .map(Number)
      .sort((a, b) => a - b)
    for (let i = 1; i < tiers.length; i++) {
      expect(prizeFor(tiers[i])).toBeGreaterThan(prizeFor(tiers[i - 1]))
    }
  })

  it("never pays for an impossible match count", () => {
    expect(prizeFor(7)).toBe(0)
    expect(prizeFor(-1)).toBe(0)
  })
})

describe("matches", () => {
  it("counts the intersection of picked and winning numbers", () => {
    expect(countMatches([1, 2, 3, 4, 5, 6], [4, 5, 6, 7, 8, 9])).toBe(3)
    expect(countMatches([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6])).toBe(6)
    expect(countMatches([1, 2, 3, 4, 5, 6], [10, 20, 30, 40, 41, 42])).toBe(0)
  })

  it("round-trips through the stored text format", () => {
    const numbers = [3, 14, 15, 26, 35, 45]
    expect(parseNumbers(formatNumbers(numbers))).toEqual(numbers)
    expect(parseNumbers("1,2, 3 ,x,4.5")).toEqual([1, 2, 3])
  })
})

describe("validateNumbers", () => {
  it("accepts six distinct numbers in range and sorts them", () => {
    expect(validateNumbers([45, 1, 22, 7, 13, 30])).toEqual([1, 7, 13, 22, 30, 45])
  })

  it("rejects wrong length, duplicates, out-of-range and non-integers", () => {
    expect(validateNumbers([1, 2, 3, 4, 5])).toBeNull()
    expect(validateNumbers([1, 2, 3, 4, 5, 6, 7])).toBeNull()
    expect(validateNumbers([1, 1, 2, 3, 4, 5])).toBeNull()
    expect(validateNumbers([0, 2, 3, 4, 5, 6])).toBeNull()
    expect(validateNumbers([1, 2, 3, 4, 5, MAX_NUMBER + 1])).toBeNull()
    expect(validateNumbers([1.5, 2, 3, 4, 5, 6])).toBeNull()
    expect(validateNumbers(["1", 2, 3, 4, 5, 6])).toBeNull()
    expect(validateNumbers("1,2,3,4,5,6")).toBeNull()
  })
})

describe("randomNumbers", () => {
  it("produces distinct sorted numbers within range", () => {
    for (let round = 0; round < 200; round++) {
      const numbers = randomNumbers()
      expect(numbers).toHaveLength(NUMBERS_PER_TICKET)
      expect(new Set(numbers).size).toBe(NUMBERS_PER_TICKET)
      expect([...numbers].sort((a, b) => a - b)).toEqual(numbers)
      for (const n of numbers) {
        expect(n).toBeGreaterThanOrEqual(1)
        expect(n).toBeLessThanOrEqual(MAX_NUMBER)
      }
    }
  })

  it("skips duplicates produced by the rng", () => {
    // 0 -> 1, 0 -> 1 (dup), then 0.5 -> 23, ...
    const rng = sequence([0, 0, 0.5, 0.1, 0.2, 0.3, 0.99])
    expect(randomNumbers(6, 45, rng)).toEqual([1, 5, 10, 14, 23, 45])
  })
})

describe("fortune wheel", () => {
  it("every segment pays a positive amount and has odds", () => {
    for (const segment of WHEEL_SEGMENTS) {
      expect(segment.amount).toBeGreaterThan(0)
      expect(segment.weight).toBeGreaterThan(0)
    }
  })

  it("pickWeighted maps the roll onto cumulative weights", () => {
    const items = [{ weight: 1 }, { weight: 2 }, { weight: 7 }]
    expect(pickWeighted(items, () => 0)).toBe(0)
    expect(pickWeighted(items, () => 0.09)).toBe(0)
    expect(pickWeighted(items, () => 0.1)).toBe(1)
    expect(pickWeighted(items, () => 0.29)).toBe(1)
    expect(pickWeighted(items, () => 0.3)).toBe(2)
    expect(pickWeighted(items, () => 0.999)).toBe(2)
  })

  it("rare prizes come up less often than common ones", () => {
    const counts = new Array(WHEEL_SEGMENTS.length).fill(0)
    for (let i = 0; i < 20_000; i++) counts[pickWeighted(WHEEL_SEGMENTS)]++
    const common = WHEEL_SEGMENTS.findIndex((s) => s.amount === 1)
    const rare = WHEEL_SEGMENTS.findIndex((s) => s.amount === 20)
    expect(counts[common]).toBeGreaterThan(counts[rare] * 5)
  })
})

describe("draw schedule (Europe/Minsk, UTC+3)", () => {
  const minsk = (iso: string) => new Date(new Date(`${iso}Z`).getTime() - MINSK_UTC_OFFSET_MS)

  it("before 20:00 the next draw is today at 20:00 Minsk", () => {
    const next = nextDrawAt(minsk("2026-10-03T12:30:00"))
    expect(next.toISOString()).toBe("2026-10-03T17:00:00.000Z")
  })

  it("at or after 20:00 the next draw is tomorrow", () => {
    expect(nextDrawAt(minsk("2026-10-03T20:00:00")).toISOString()).toBe("2026-10-04T17:00:00.000Z")
    expect(nextDrawAt(minsk("2026-10-03T23:59:59")).toISOString()).toBe("2026-10-04T17:00:00.000Z")
  })

  it("is independent of the server's local time zone", () => {
    const now = new Date("2026-12-31T22:00:00Z") // 01:00 on Jan 1 in Minsk
    const next = nextDrawAt(now)
    expect(next.getUTCHours()).toBe(DRAW_HOUR_MINSK - 3)
    expect(next.toISOString()).toBe("2027-01-01T17:00:00.000Z")
  })

  it("minskDayKey rolls over at Minsk midnight, not UTC midnight", () => {
    expect(minskDayKey(new Date("2026-10-03T20:59:59Z"))).toBe("2026-10-03")
    expect(minskDayKey(new Date("2026-10-03T21:00:00Z"))).toBe("2026-10-04")
  })

  it("nextMinskMidnight is 21:00 UTC of the current Minsk day", () => {
    expect(nextMinskMidnight(new Date("2026-10-03T10:00:00Z")).toISOString()).toBe("2026-10-03T21:00:00.000Z")
    expect(nextMinskMidnight(new Date("2026-10-03T21:00:00Z")).toISOString()).toBe("2026-10-04T21:00:00.000Z")
  })
})

describe("games", () => {
  it("resolves cost by name and rejects unknown games", () => {
    for (const game of GAMES) expect(gameCost(game.name)).toBe(game.cost)
    expect(gameCost("Нет такой")).toBeNull()
    expect(gameCost("__proto__")).toBeNull()
  })
})
