/**
 * «Путь ниндзя» — rules shared by the server, the UI and the tests (browser-safe).
 *
 * A 5×5 field of sealed scrolls hides `traps` Akatsuki traps. Every scroll the
 * player opens with a kunai is either chakra (safe) or a trap (round lost).
 * The player may stop at any time and collect stake × multiplier.
 *
 * Fairness: the multiplier ladder is derived step by step from the real odds
 * of the field, so that continuing is exactly as valuable as stopping:
 *
 *   mult(k) = p · mult(k+1) + (1 − p) · refund(k)
 *
 * where p is the chance the next scroll is safe and refund(k) is the payout
 * the player keeps on a bust after reaching a rank. Starting from
 * mult(0) = HOUSE (0.95) this makes every strategy return 95% on average.
 *
 * Ranks: after 3 / 6 / 10 / 15 safe scrolls the player becomes Genin, Chunin,
 * Jonin or Kage and locks half of that rank's multiplier as insurance.
 * Sharingan: some safe scrolls carry the Sharingan — opening one also reveals
 * (seals) one trap. Because the ladder is recomputed from the real odds after
 * every step, the hint never changes the expected return.
 * Awakening (bonus buy): start the round with the first 3 or 6 safe scrolls
 * already opened, priced at the exact value of that state divided by HOUSE.
 */
import type { Rng } from "@/lib/lottery"

export const NINJA_GAME_NAME = "Путь ниндзя"
export const NINJA_SIZE = 5
export const NINJA_CELLS = NINJA_SIZE * NINJA_SIZE
export const NINJA_MIN_TRAPS = 1
export const NINJA_MAX_TRAPS = 10
export const NINJA_MIN_STAKE = 1
export const NINJA_MAX_STAKE = 100
/** Payout cap: the round is settled automatically once the ladder reaches it. */
export const NINJA_MAX_MULTIPLIER = 5000
export const NINJA_HOUSE = 0.95
/** Chance for a safe scroll to carry the Sharingan; at most two per field. */
export const NINJA_SHARINGAN_CHANCE = 0.08
export const NINJA_MAX_SHARINGAN = 2

export type NinjaRankId = "genin" | "chunin" | "jonin" | "kage"

export type NinjaRank = { id: NinjaRankId; label: string; reveals: number; refundShare: number }

export const NINJA_RANKS: readonly NinjaRank[] = [
  { id: "genin", label: "Генин", reveals: 3, refundShare: 0.5 },
  { id: "chunin", label: "Чунин", reveals: 6, refundShare: 0.5 },
  { id: "jonin", label: "Джонин", reveals: 10, refundShare: 0.5 },
  { id: "kage", label: "Каге", reveals: 15, refundShare: 0.5 },
]

/** Bonus-buy entry points: the rank the round starts at. */
export const NINJA_AWAKENINGS: readonly { id: NinjaRankId; reveals: number }[] = [
  { id: "genin", reveals: 3 },
  { id: "chunin", reveals: 6 },
]

export type NinjaStatus = "active" | "cashed" | "bust" | "complete"

/** Secret per-round layout; stays on the server until the round ends. */
export type NinjaLayout = {
  traps: number[]
  sharingan: number[]
  /** Order in which Sharingan scrolls seal the traps. */
  sealOrder: number[]
}

/** Everything the client may know while a round is in progress. */
export type NinjaState = {
  traps: number
  /** Safe cells opened, in order. */
  revealed: number[]
  /** Trap cells shown by the Sharingan (cannot be opened). */
  sealed: number[]
  /** Opened cells that carried the Sharingan. */
  sharingan: number[]
  multiplier: number
  /** Multiplier the player keeps on a bust. */
  refund: number
  rank: NinjaRankId | null
  status: NinjaStatus
  bustCell: number | null
}

export type NinjaEvent =
  | { type: "safe"; cell: number; sharingan: false }
  | { type: "safe"; cell: number; sharingan: true; sealedCell: number }
  | { type: "bust"; cell: number }

// Strict rounding (the epsilon only absorbs binary float noise, never a real fraction).
// Ladder values keep 4 decimals so the edge does not creep up at low multipliers; money is 2.
const floor2 = (value: number) => Math.floor(value * 100 + 1e-7) / 100
const ceil2 = (value: number) => Math.ceil(value * 100 - 1e-7) / 100
const floor4 = (value: number) => Math.floor(value * 10000 + 1e-6) / 10000

export function isNinjaTraps(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= NINJA_MIN_TRAPS && value <= NINJA_MAX_TRAPS
}

export function isNinjaStake(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= NINJA_MIN_STAKE && value <= NINJA_MAX_STAKE
}

export function isNinjaCell(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < NINJA_CELLS
}

export function isNinjaAwakening(value: unknown): value is number {
  return value === 0 || NINJA_AWAKENINGS.some((a) => a.reveals === value)
}

export function rankFor(reveals: number): NinjaRank | null {
  let best: NinjaRank | null = null
  for (const rank of NINJA_RANKS) if (reveals >= rank.reveals) best = rank
  return best
}

/** Payouts are paid to the kopeck: stake × multiplier rounded down to 0.01 BYN. */
export function ninjaPayout(stake: number, multiplier: number): number {
  return floor2(stake * multiplier)
}

/**
 * Multiplier after one more safe scroll, given the current ladder value, the
 * insurance in force and the real odds (`unknown` closed cells, `traps` of them).
 */
export function nextMultiplier(multiplier: number, refund: number, unknown: number, traps: number): number {
  if (traps <= 0 || unknown <= traps) return multiplier
  const p = (unknown - traps) / unknown
  const next = (multiplier - (1 - p) * refund) / p
  return Math.min(NINJA_MAX_MULTIPLIER, floor4(next))
}

/**
 * The expected ladder without Sharingan hints: `ladder[k]` is the multiplier
 * after k safe scrolls. Used for the preview and to price the Awakening.
 */
export function ninjaLadder(traps: number): number[] {
  const ladder = [NINJA_HOUSE]
  let refund = 0
  const safe = NINJA_CELLS - traps
  for (let k = 0; k < safe; k++) {
    const multiplier = nextMultiplier(ladder[k], refund, NINJA_CELLS - k, traps)
    ladder.push(multiplier)
    const rank = NINJA_RANKS.find((r) => r.reveals === k + 1)
    if (rank) refund = floor4(multiplier * rank.refundShare)
    if (multiplier >= NINJA_MAX_MULTIPLIER) break
  }
  return ladder
}

/** Total price of a round that starts with `reveals` scrolls already open (stake included). */
export function awakeningCost(stake: number, traps: number, reveals: number): number {
  if (reveals === 0) return stake
  const ladder = ninjaLadder(traps)
  return ceil2((stake * ladder[reveals]) / NINJA_HOUSE)
}

export function ninjaMaxMultiplier(traps: number): number {
  const ladder = ninjaLadder(traps)
  return ladder[ladder.length - 1]
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

/**
 * Lays out a field: `traps` trap cells, Sharingan flags on some of the other
 * cells and — for an Awakening — `preReveal` safe cells that are opened before
 * the player's first move. Pre-opened cells never carry the Sharingan, so the
 * price of the Awakening is known in advance.
 */
export function createNinjaLayout(traps: number, rng: Rng, preReveal = 0): { layout: NinjaLayout; preRevealed: number[] } {
  const cells = shuffle(Array.from({ length: NINJA_CELLS }, (_, i) => i), rng)
  const trapCells = cells.slice(0, traps)
  const safeCells = cells.slice(traps)
  const preRevealed = safeCells.slice(0, preReveal)
  const sharingan: number[] = []
  for (const cell of safeCells.slice(preReveal)) {
    if (sharingan.length >= NINJA_MAX_SHARINGAN) break
    if (rng() < NINJA_SHARINGAN_CHANCE) sharingan.push(cell)
  }
  const sealOrder = shuffle([...trapCells], rng)
  return { layout: { traps: trapCells.sort((a, b) => a - b), sharingan, sealOrder }, preRevealed }
}

export function initialNinjaState(traps: number): NinjaState {
  return {
    traps,
    revealed: [],
    sealed: [],
    sharingan: [],
    multiplier: NINJA_HOUSE,
    refund: 0,
    rank: null,
    status: "active",
    bustCell: null,
  }
}

function closedCells(state: NinjaState) {
  return NINJA_CELLS - state.revealed.length - state.sealed.length
}

function trapsLeft(state: NinjaState) {
  return state.traps - state.sealed.length
}

export function canOpen(state: NinjaState, cell: number): boolean {
  return (
    state.status === "active" && isNinjaCell(cell) && !state.revealed.includes(cell) && !state.sealed.includes(cell)
  )
}

/** Opens one scroll. Returns the new state and what happened; the input state is not mutated. */
export function revealNinjaCell(state: NinjaState, layout: NinjaLayout, cell: number): { state: NinjaState; event: NinjaEvent } {
  if (!canOpen(state, cell)) throw new Error("Cell cannot be opened")

  if (layout.traps.includes(cell)) {
    return {
      state: { ...state, status: "bust", bustCell: cell, multiplier: state.refund },
      event: { type: "bust", cell },
    }
  }

  const multiplier = nextMultiplier(state.multiplier, state.refund, closedCells(state), trapsLeft(state))
  const revealed = [...state.revealed, cell]
  const rank = rankFor(revealed.length)
  const refund = rank && rank.id !== state.rank ? floor4(multiplier * rank.refundShare) : state.refund

  let sealed = state.sealed
  let sharingan = state.sharingan
  let event: NinjaEvent = { type: "safe", cell, sharingan: false }
  if (layout.sharingan.includes(cell)) {
    const sealedCell = layout.sealOrder.find((trap) => !state.sealed.includes(trap))
    if (sealedCell !== undefined) {
      sealed = [...state.sealed, sealedCell]
      sharingan = [...state.sharingan, cell]
      event = { type: "safe", cell, sharingan: true, sealedCell }
    }
  }

  const next: NinjaState = { ...state, revealed, sealed, sharingan, multiplier, refund, rank: rank?.id ?? null }
  // Nothing left to risk: cap reached, every closed cell is a trap, or every trap is sealed.
  const finished =
    multiplier >= NINJA_MAX_MULTIPLIER ||
    NINJA_CELLS - revealed.length - sealed.length <= state.traps - sealed.length ||
    state.traps === sealed.length
  return { state: finished ? { ...next, status: "complete" } : next, event }
}

export function cashoutNinja(state: NinjaState): NinjaState {
  if (state.status !== "active" || state.revealed.length === 0) throw new Error("Nothing to collect")
  return { ...state, status: "cashed" }
}

/** Multiplier the player would be paid right now (0 while nothing is opened). */
export function currentMultiplier(state: NinjaState): number {
  if (state.status === "bust") return state.refund
  return state.revealed.length === 0 ? 0 : state.multiplier
}

/** Multiplier after the next safe scroll, for the "next" preview. */
export function previewNextMultiplier(state: NinjaState): number {
  return nextMultiplier(state.multiplier, state.refund, closedCells(state), trapsLeft(state))
}

export function formatNinjaMultiplier(m: number): string {
  if (m >= 100) return `x${Math.floor(m).toLocaleString("ru-RU")}`
  return `x${floor2(m).toFixed(2).replace(".", ",").replace(/,?0+$/, "")}`
}

/**
 * Exact expected return of a fixed strategy "open `target` scrolls, then
 * collect" on the Sharingan-free ladder — a test helper for the 95% edge.
 */
export function ninjaExpectedReturn(traps: number, target: number): number {
  const ladder = ninjaLadder(traps)
  let probability = 1
  let total = 0
  let refund = 0
  for (let k = 0; k < target; k++) {
    const unknown = NINJA_CELLS - k
    const p = (unknown - traps) / unknown
    total += probability * (1 - p) * refund
    probability *= p
    const rank = NINJA_RANKS.find((r) => r.reveals === k + 1)
    if (rank) refund = floor4(ladder[k + 1] * rank.refundShare)
  }
  return total + probability * ladder[target]
}
