import { and, asc, eq, gte, inArray, sql } from "drizzle-orm"
import type { db } from "@/lib/db"
import type { Tx } from "@/lib/db/ledger"
import { bonusClaim, paymentCard, transaction } from "@/lib/db/schema"
import { WELCOME_BONUS } from "@/lib/lottery"

const MINSK_UTC_OFFSET_MS = 3 * 60 * 60 * 1000
const DEPOSIT_TYPES = ["deposit", "crypto_deposit"]

export const CARD_BONUS = 5
export const FIRST_DEPOSIT_RATE = 1
export const FIRST_DEPOSIT_CAP = 100
export const RELOAD_RATE = 0.1
export const RELOAD_MIN_DEPOSITS = 50
export const RELOAD_CAP = 50

export type BonusId = "welcome" | "card" | "first_deposit" | "reload"

export type BonusState =
  | { status: "claimable"; amount: number }
  | { status: "claimed"; amount: number; until?: string }
  | { status: "locked"; hint: string; progress?: { current: number; target: number } }

export type BonusOverview = Record<BonusId, BonusState>

/** Monday of the current Minsk week (YYYY-MM-DD) and its UTC start instant. */
export function minskWeek(now: Date = new Date()) {
  const shifted = new Date(now.getTime() + MINSK_UTC_OFFSET_MS)
  const weekday = (shifted.getUTCDay() + 6) % 7
  const mondayUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - weekday)
  const key = new Date(mondayUtc).toISOString().slice(0, 10)
  return {
    key,
    start: new Date(mondayUtc - MINSK_UTC_OFFSET_MS),
    nextStart: new Date(mondayUtc + 7 * 86_400_000 - MINSK_UTC_OFFSET_MS),
  }
}

export function bonusCode(id: BonusId, now: Date = new Date()) {
  return id === "reload" ? `reload:${minskWeek(now).key}` : id
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Computes every offer from the ledger, so eligibility can never drift from real money movements. */
export async function getBonusOverview(executor: Tx | typeof db, userId: string): Promise<BonusOverview> {
  const week = minskWeek()
  const [claims, welcome, cards, firstDeposit, weekDeposits] = await Promise.all([
    executor.select({ code: bonusClaim.code, amount: bonusClaim.amount }).from(bonusClaim).where(eq(bonusClaim.userId, userId)),
    executor.select({ amount: transaction.amount }).from(transaction)
      .where(and(eq(transaction.userId, userId), eq(transaction.type, "welcome"))).limit(1),
    executor.select({ id: paymentCard.id }).from(paymentCard)
      .where(and(eq(paymentCard.userId, userId), eq(paymentCard.status, "confirmed"))).limit(1),
    executor.select({ amount: transaction.amount }).from(transaction)
      .where(and(eq(transaction.userId, userId), inArray(transaction.type, DEPOSIT_TYPES)))
      .orderBy(asc(transaction.createdAt)).limit(1),
    executor.select({ total: sql<number>`coalesce(sum(${transaction.amount}), 0)` }).from(transaction)
      .where(and(eq(transaction.userId, userId), inArray(transaction.type, DEPOSIT_TYPES), gte(transaction.createdAt, week.start))),
  ])
  const claimed = new Map(claims.map((c) => [c.code, Number(c.amount)]))

  const welcomeState: BonusState = welcome[0]
    ? { status: "claimed", amount: Number(welcome[0].amount) }
    : { status: "claimable", amount: WELCOME_BONUS }

  const cardState: BonusState = claimed.has("card")
    ? { status: "claimed", amount: claimed.get("card")! }
    : cards[0]
      ? { status: "claimable", amount: CARD_BONUS }
      : { status: "locked", hint: "Привяжите и подтвердите банковскую карту" }

  const first = firstDeposit[0] ? Number(firstDeposit[0].amount) : 0
  const firstState: BonusState = claimed.has("first_deposit")
    ? { status: "claimed", amount: claimed.get("first_deposit")! }
    : first > 0
      ? { status: "claimable", amount: round2(Math.min(first * FIRST_DEPOSIT_RATE, FIRST_DEPOSIT_CAP)) }
      : { status: "locked", hint: "Сделайте первое пополнение — удвоим его" }

  const reloadCode = `reload:${week.key}`
  const weekTotal = Number(weekDeposits[0]?.total ?? 0)
  const reloadState: BonusState = claimed.has(reloadCode)
    ? { status: "claimed", amount: claimed.get(reloadCode)!, until: week.nextStart.toISOString() }
    : weekTotal >= RELOAD_MIN_DEPOSITS
      ? { status: "claimable", amount: round2(Math.min(weekTotal * RELOAD_RATE, RELOAD_CAP)) }
      : {
          status: "locked",
          hint: `Пополните на ${RELOAD_MIN_DEPOSITS} BYN за неделю`,
          progress: { current: weekTotal, target: RELOAD_MIN_DEPOSITS },
        }

  return { welcome: welcomeState, card: cardState, first_deposit: firstState, reload: reloadState }
}

export function claimableTotal(overview: BonusOverview) {
  return Object.values(overview).reduce((sum, s) => (s.status === "claimable" ? sum + s.amount : sum), 0)
}
