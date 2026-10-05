/**
 * Plinko rules shared by the server, the UI and the tests (browser-safe).
 * A ball falls through `rows` rows of pegs; at each peg it goes left or right
 * with equal odds, so the landing slot (0..rows) follows a binomial law.
 */
import type { Rng } from "@/lib/lottery"

export const PLINKO_GAME_NAME = "Плинко"
export const PLINKO_MIN_ROWS = 8
export const PLINKO_MAX_ROWS = 16
export const PLINKO_MIN_STAKE = 1
export const PLINKO_MAX_STAKE = 100

export type PlinkoRisk = "low" | "medium" | "high"

export const PLINKO_RISKS: readonly { id: PlinkoRisk; label: string }[] = [
  { id: "low", label: "Минимум" },
  { id: "medium", label: "Средний" },
  { id: "high", label: "Высокий" },
]

/** Multipliers per slot, outer slots first. Every table pays back under 100% on average. */
const TABLES: Record<number, Record<PlinkoRisk, readonly number[]>> = {
  8: {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  9: {
    low: [5.6, 2, 1.6, 1, 0.7, 0.7, 1, 1.6, 2, 5.6],
    medium: [18, 4, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4, 18],
    high: [43, 7, 2, 0.6, 0.2, 0.2, 0.6, 2, 7, 43],
  },
  10: {
    low: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    medium: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    high: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
  },
  11: {
    low: [8.4, 3, 1.9, 1.3, 1, 0.7, 0.7, 1, 1.3, 1.9, 3, 8.4],
    medium: [24, 6, 3, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3, 6, 24],
    high: [120, 14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  13: {
    low: [8.1, 4, 3, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3, 4, 8.1],
    medium: [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 6, 13, 43],
    high: [260, 37, 11, 4, 1, 0.2, 0.2, 0.2, 0.2, 1, 4, 11, 37, 260],
  },
  14: {
    low: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
    medium: [58, 15, 7, 4, 1.9, 1, 0.5, 0.2, 0.5, 1, 1.9, 4, 7, 15, 58],
    high: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
  },
  15: {
    low: [15, 8, 3, 2, 1.5, 1.1, 1, 0.7, 0.7, 1, 1.1, 1.5, 2, 3, 8, 15],
    medium: [88, 18, 11, 5, 3, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3, 5, 11, 18, 88],
    high: [620, 83, 27, 8, 3, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3, 8, 27, 83, 620],
  },
  16: {
    low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
}

export function isPlinkoRisk(value: unknown): value is PlinkoRisk {
  return value === "low" || value === "medium" || value === "high"
}

export function isPlinkoRows(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= PLINKO_MIN_ROWS && value <= PLINKO_MAX_ROWS
}

export function plinkoMultipliers(rows: number, risk: PlinkoRisk): readonly number[] {
  return TABLES[rows][risk]
}

/** Payouts are whole BYN: the fractional part of stake × multiplier is dropped. */
export function plinkoPayout(stake: number, multiplier: number): number {
  return Math.floor(stake * multiplier + 1e-9)
}

export type PlinkoOutcome = { path: number[]; slot: number; multiplier: number; payout: number }

/** One drop: `path[i]` is 1 when the ball bounces right at row i. */
export function playPlinko(stake: number, rows: number, risk: PlinkoRisk, rng: Rng): PlinkoOutcome {
  const path = Array.from({ length: rows }, () => (rng() < 0.5 ? 0 : 1))
  const slot = path.reduce<number>((sum, step) => sum + step, 0)
  const multiplier = plinkoMultipliers(rows, risk)[slot]
  return { path, slot, multiplier, payout: plinkoPayout(stake, multiplier) }
}

/** Exact expected return of a table (multiplier weighted by binomial slot odds). */
export function plinkoExpectedReturn(rows: number, risk: PlinkoRisk): number {
  const table = plinkoMultipliers(rows, risk)
  let coefficient = 1
  let total = 0
  for (let k = 0; k <= rows; k++) {
    total += table[k] * coefficient
    coefficient = (coefficient * (rows - k)) / (k + 1)
  }
  return total / 2 ** rows
}

export function formatMultiplier(m: number): string {
  return `x${m >= 100 ? Math.round(m) : String(m).replace(".", ",")}`
}
