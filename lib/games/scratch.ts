/**
 * «Счастливая шестёрка» — scratch card with six hidden fields (browser-safe).
 * The prize depends on how many fields show the same symbol: three or more
 * identical symbols win, and the more of them, the bigger the multiplier.
 */
import { pickWeighted, type Rng } from "@/lib/lottery"

export const SCRATCH_GAME_NAME = "Счастливая шестёрка"
export const SCRATCH_FIELDS = 6

export const SCRATCH_SYMBOLS = ["clover", "star", "crown", "diamond", "coin", "seven"] as const
export type ScratchSymbol = (typeof SCRATCH_SYMBOLS)[number]

export const SCRATCH_SYMBOL_LABELS: Record<ScratchSymbol, string> = {
  clover: "Клевер",
  star: "Звезда",
  crown: "Корона",
  diamond: "Бриллиант",
  coin: "Монета",
  seven: "Семёрка",
}

export const SCRATCH_PRICES = [1, 3, 5] as const
export type ScratchPrice = (typeof SCRATCH_PRICES)[number]

/** Odds out of 10 000 for the size of the biggest identical group; 0 means no win. Expected return 95%. */
export const SCRATCH_TIERS: readonly { matches: number; multiplier: number; weight: number }[] = [
  { matches: 6, multiplier: 100, weight: 5 },
  { matches: 5, multiplier: 20, weight: 100 },
  { matches: 4, multiplier: 5, weight: 600 },
  { matches: 3, multiplier: 2, weight: 2000 },
  { matches: 0, multiplier: 0, weight: 7295 },
]

export function isScratchPrice(value: unknown): value is ScratchPrice {
  return SCRATCH_PRICES.includes(value as ScratchPrice)
}

export function scratchExpectedReturn(): number {
  const total = SCRATCH_TIERS.reduce((sum, t) => sum + t.weight, 0)
  return SCRATCH_TIERS.reduce((sum, t) => sum + t.multiplier * t.weight, 0) / total
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export type ScratchOutcome = {
  fields: ScratchSymbol[]
  /** Size of the winning group (0 when the card loses). */
  matches: number
  winningSymbol: ScratchSymbol | null
  multiplier: number
  prize: number
}

/** Size of the biggest group of identical symbols and its symbol. */
export function largestGroup(fields: readonly ScratchSymbol[]): { symbol: ScratchSymbol; count: number } {
  const counts = new Map<ScratchSymbol, number>()
  for (const f of fields) counts.set(f, (counts.get(f) ?? 0) + 1)
  let best: { symbol: ScratchSymbol; count: number } = { symbol: fields[0], count: 0 }
  for (const [symbol, count] of counts) if (count > best.count) best = { symbol, count }
  return best
}

/**
 * Picks the prize tier first, then lays out six fields consistent with it:
 * the winning symbol appears exactly `matches` times and every other symbol
 * at most twice, so a card can never show a bigger group than it pays for.
 */
export function playScratch(price: ScratchPrice, rng: Rng): ScratchOutcome {
  const tier = SCRATCH_TIERS[pickWeighted(SCRATCH_TIERS, rng)]
  const symbols = [...SCRATCH_SYMBOLS]

  let winningSymbol: ScratchSymbol | null = null
  const fields: ScratchSymbol[] = []
  if (tier.matches > 0) {
    winningSymbol = symbols[Math.floor(rng() * symbols.length)]
    for (let i = 0; i < tier.matches; i++) fields.push(winningSymbol)
  }
  const fillers = shuffle(
    symbols.filter((s) => s !== winningSymbol).flatMap((s) => [s, s]),
    rng,
  )
  fields.push(...fillers.slice(0, SCRATCH_FIELDS - fields.length))
  shuffle(fields, rng)

  return {
    fields,
    matches: tier.matches,
    winningSymbol,
    multiplier: tier.multiplier,
    prize: price * tier.multiplier,
  }
}
