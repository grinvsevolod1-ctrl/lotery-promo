/**
 * «Буст удачи» — global luck boost (browser-safe).
 * Payout tables never change. At level N the server plays the round N times
 * from one seeded stream and credits the best attempt, so a round stays
 * reproducible from its seed and the stored `luck` value.
 */
import { GAMES, WHEEL_SEGMENTS, prizeFor, type Game, type Rng } from "@/lib/lottery"
import { plinkoMultipliers, type PlinkoRisk } from "@/lib/games/plinko"
import { SCRATCH_TIERS } from "@/lib/games/scratch"

export type LuckLevel = { attempts: number; label: string }

export const LUCK_LEVELS: readonly LuckLevel[] = [
  { attempts: 1, label: "Выкл" },
  { attempts: 2, label: "Повышенный" },
  { attempts: 3, label: "Высокий" },
  { attempts: 5, label: "Очень высокий" },
  { attempts: 8, label: "Максимальный" },
]

/** Levels from this many attempts ask the admin to confirm. */
export const LUCK_CONFIRM_FROM = 5

export function isLuckAttempts(value: unknown): value is number {
  return LUCK_LEVELS.some((l) => l.attempts === value)
}

export function normalizeLuck(value: unknown): number {
  return isLuckAttempts(value) ? value : 1
}

export function luckLabel(attempts: number): string {
  return LUCK_LEVELS.find((l) => l.attempts === attempts)?.label ?? "Выкл"
}

/** Plays `n` attempts from the same stream and returns the highest-scoring one (first on ties). */
export function bestOf<T>(n: number, rng: Rng, play: (rng: Rng) => T, score: (outcome: T) => number): T {
  let best = play(rng)
  let bestScore = score(best)
  for (let i = 1; i < n; i++) {
    const next = play(rng)
    const nextScore = score(next)
    if (nextScore > bestScore) {
      best = next
      bestScore = nextScore
    }
  }
  return best
}

export type Distribution = readonly { value: number; p: number }[]

/** Exact mean of the best of `n` independent draws, using P(max ≤ x) = F(x)^n. */
export function expectedReturnBestOf(distribution: Distribution, n: number): number {
  const sorted = [...distribution].sort((a, b) => a.value - b.value)
  const total = sorted.reduce((sum, d) => sum + d.p, 0)
  let cumulative = 0
  let previous = 0
  let mean = 0
  for (const { value, p } of sorted) {
    cumulative += p / total
    const current = Math.min(1, cumulative) ** n
    mean += value * (current - previous)
    previous = current
  }
  return mean
}

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let result = 1
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i
  return result
}

/** Return per 1 BYN staked by the number of matches (hypergeometric odds). */
export function instantDistribution(game: Game): Distribution {
  const all = binomial(game.max, game.pick)
  return Array.from({ length: game.pick + 1 }, (_, k) => ({
    value: prizeFor(game, k) / game.cost,
    p: (binomial(game.pick, k) * binomial(game.max - game.pick, game.pick - k)) / all,
  }))
}

export function scratchDistribution(): Distribution {
  return SCRATCH_TIERS.map((t) => ({ value: t.multiplier, p: t.weight }))
}

export function plinkoDistribution(rows: number, risk: PlinkoRisk): Distribution {
  return plinkoMultipliers(rows, risk).map((value, k) => ({ value, p: binomial(rows, k) / 2 ** rows }))
}

/** Wheel values are BYN per spin, not a return ratio: the spin is free. */
export function wheelDistribution(): Distribution {
  return WHEEL_SEGMENTS.map((s) => ({ value: s.amount, p: s.weight }))
}

export type LuckGameRow = { id: string; name: string; unit: "ratio" | "byn"; distribution: Distribution }

export const LUCK_GAME_ROWS: readonly LuckGameRow[] = [
  ...GAMES.map((g) => ({ id: g.id, name: g.name, unit: "ratio" as const, distribution: instantDistribution(g) })),
  { id: "scratch", name: "Счастливая шестёрка", unit: "ratio", distribution: scratchDistribution() },
  { id: "plinko-low", name: "Плинко (8 рядов, минимум)", unit: "ratio", distribution: plinkoDistribution(8, "low") },
  { id: "plinko-high", name: "Плинко (16 рядов, высокий)", unit: "ratio", distribution: plinkoDistribution(16, "high") },
  { id: "wheel", name: "Колесо фортуны, BYN за спин", unit: "byn", distribution: wheelDistribution() },
]
