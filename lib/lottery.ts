/**
 * Pure lottery rules shared by the server, the cabinet UI and the tests.
 * No Node-only imports here: this file is also bundled for the browser.
 */

export const NUMBERS_PER_TICKET = 6
export const MAX_NUMBER = 45
export const WELCOME_BONUS = 20

/** Europe/Minsk has used UTC+3 without daylight saving since 2011. */
export const MINSK_UTC_OFFSET_MS = 3 * 60 * 60 * 1000
export const DRAW_HOUR_MINSK = 20
export const MINSK_TIME_ZONE = "Europe/Minsk"

export type Game = { name: string; cost: number; tone: string }

export const GAMES: readonly Game[] = [
  { name: "Суперлото", cost: 3, tone: "from-primary to-accent" },
  { name: "Пятёрочка", cost: 2, tone: "from-accent to-gold" },
  { name: "КЕНО", cost: 1, tone: "from-gold to-primary" },
]

export function gameCost(name: string): number | null {
  const game = GAMES.find((g) => g.name === name)
  return game ? game.cost : null
}

/** Bonus prize (BYN) by the count of matched numbers. */
export const PRIZE_BY_MATCHES: Readonly<Record<number, number>> = {
  3: 2,
  4: 10,
  5: 100,
  6: 1000,
}

export function prizeFor(matches: number): number {
  return PRIZE_BY_MATCHES[matches] ?? 0
}

export type WheelSegment = { label: string; amount: number; weight: number }

/** Daily free spin. Weights are relative odds; every segment pays something. */
export const WHEEL_SEGMENTS: readonly WheelSegment[] = [
  { label: "+1 BYN", amount: 1, weight: 30 },
  { label: "+3 BYN", amount: 3, weight: 22 },
  { label: "+2 BYN", amount: 2, weight: 26 },
  { label: "+10 BYN", amount: 10, weight: 6 },
  { label: "+1 BYN", amount: 1, weight: 30 },
  { label: "+5 BYN", amount: 5, weight: 14 },
  { label: "+2 BYN", amount: 2, weight: 26 },
  { label: "+20 BYN", amount: 20, weight: 2 },
]

export type Rng = () => number

export function randomNumbers(count = NUMBERS_PER_TICKET, max = MAX_NUMBER, rng: Rng = Math.random) {
  const set = new Set<number>()
  while (set.size < count) set.add(Math.floor(rng() * max) + 1)
  return [...set].sort((a, b) => a - b)
}

export function pickWeighted<T extends { weight: number }>(items: readonly T[], rng: Rng = Math.random) {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = rng() * total
  for (let i = 0; i < items.length; i++) {
    roll -= items[i].weight
    if (roll < 0) return i
  }
  return items.length - 1
}

export function parseNumbers(value: string): number[] {
  return value
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n))
}

export function formatNumbers(numbers: readonly number[]): string {
  return numbers.join(", ")
}

/**
 * Validates a player's pick: exactly NUMBERS_PER_TICKET distinct integers in
 * [1, MAX_NUMBER]. Returns the sorted numbers or null.
 */
export function validateNumbers(input: unknown): number[] | null {
  if (!Array.isArray(input) || input.length !== NUMBERS_PER_TICKET) return null
  const seen = new Set<number>()
  for (const raw of input) {
    if (typeof raw !== "number" || !Number.isInteger(raw)) return null
    if (raw < 1 || raw > MAX_NUMBER || seen.has(raw)) return null
    seen.add(raw)
  }
  return [...seen].sort((a, b) => a - b)
}

export function countMatches(picked: readonly number[], winning: readonly number[]): number {
  const set = new Set(winning)
  return picked.filter((n) => set.has(n)).length
}

/** Next draw instant strictly after `now`: DRAW_HOUR_MINSK:00 Minsk time. */
export function nextDrawAt(now: Date = new Date()): Date {
  const minskWallClock = new Date(now.getTime() + MINSK_UTC_OFFSET_MS)
  let candidate =
    Date.UTC(
      minskWallClock.getUTCFullYear(),
      minskWallClock.getUTCMonth(),
      minskWallClock.getUTCDate(),
      DRAW_HOUR_MINSK,
    ) - MINSK_UTC_OFFSET_MS
  if (candidate <= now.getTime()) candidate += 24 * 60 * 60 * 1000
  return new Date(candidate)
}

/** Calendar day in Minsk as YYYY-MM-DD, used to limit one spin per day. */
export function minskDayKey(date: Date = new Date()): string {
  return new Date(date.getTime() + MINSK_UTC_OFFSET_MS).toISOString().slice(0, 10)
}

/** Next midnight in Minsk — when the daily spin becomes available again. */
export function nextMinskMidnight(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + MINSK_UTC_OFFSET_MS)
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1) - MINSK_UTC_OFFSET_MS,
  )
}
