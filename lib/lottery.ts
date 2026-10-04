/**
 * Pure lottery rules shared by the server, the cabinet UI and the tests.
 * No Node-only imports here: this file is also bundled for the browser.
 *
 * Every ticket is instant: the player picks numbers, the server draws the
 * winning combination for that ticket right away and pays the prize at once.
 */

export const WELCOME_BONUS = 20

/** Europe/Minsk has used UTC+3 without daylight saving since 2011. */
export const MINSK_UTC_OFFSET_MS = 3 * 60 * 60 * 1000
export const MINSK_TIME_ZONE = "Europe/Minsk"

export type GameId = "super" | "five" | "keno"

export type Game = {
  id: GameId
  name: string
  /** How many numbers the player marks. */
  pick: number
  /** Numbers range from 1 to `max`. */
  max: number
  cost: number
  /** Prize in BYN by the count of matched numbers. */
  prizes: Readonly<Record<number, number>>
  tagline: string
  tone: string
}

export const GAMES: readonly Game[] = [
  {
    id: "keno",
    name: "КЕНО",
    pick: 4,
    max: 20,
    cost: 1,
    prizes: { 2: 1, 3: 25, 4: 1000 },
    tagline: "Самая частая удача",
    tone: "from-gold to-primary",
  },
  {
    id: "five",
    name: "Пятёрочка",
    pick: 5,
    max: 36,
    cost: 2,
    prizes: { 2: 3, 3: 40, 4: 800, 5: 50000 },
    tagline: "Баланс шанса и приза",
    tone: "from-accent to-gold",
  },
  {
    id: "super",
    name: "Суперлото",
    pick: 6,
    max: 45,
    cost: 3,
    prizes: { 2: 4, 3: 40, 4: 400, 5: 10000, 6: 500000 },
    tagline: "Главный суперприз",
    tone: "from-primary to-accent",
  },
]

export function getGame(idOrName: string): Game | null {
  return GAMES.find((g) => g.id === idOrName || g.name === idOrName) ?? null
}

export function gameCost(idOrName: string): number | null {
  return getGame(idOrName)?.cost ?? null
}

export function topPrize(game: Game): number {
  return game.prizes[game.pick] ?? 0
}

export function prizeFor(game: Game, matches: number): number {
  return Object.hasOwn(game.prizes, matches) ? game.prizes[matches] : 0
}

/** Smallest number of matches that pays anything in this game. */
export function minWinningMatches(game: Game): number {
  return Math.min(...Object.keys(game.prizes).map(Number))
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

export function randomNumbers(count: number, max: number, rng: Rng = Math.random) {
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

export function parseNumbers(value: string | null | undefined): number[] {
  if (!value) return []
  return value
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n))
}

export function formatNumbers(numbers: readonly number[]): string {
  return numbers.join(", ")
}

/**
 * Validates a player's pick for a game: exactly `game.pick` distinct integers
 * in [1, game.max]. Returns the sorted numbers or null.
 */
export function validateNumbers(game: Game, input: unknown): number[] | null {
  if (!Array.isArray(input) || input.length !== game.pick) return null
  const seen = new Set<number>()
  for (const raw of input) {
    if (typeof raw !== "number" || !Number.isInteger(raw)) return null
    if (raw < 1 || raw > game.max || seen.has(raw)) return null
    seen.add(raw)
  }
  return [...seen].sort((a, b) => a - b)
}

export function countMatches(picked: readonly number[], winning: readonly number[]): number {
  const set = new Set(winning)
  return picked.filter((n) => set.has(n)).length
}

export type InstantOutcome = { winning: number[]; matches: number; prize: number }

/** Draws the winning combination for one ticket and computes its prize. */
export function playInstant(game: Game, picked: readonly number[], rng: Rng = Math.random): InstantOutcome {
  const winning = randomNumbers(game.pick, game.max, rng)
  const matches = countMatches(picked, winning)
  return { winning, matches, prize: prizeFor(game, matches) }
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
