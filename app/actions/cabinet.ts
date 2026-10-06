"use server"

import { db } from "@/lib/db"
import { balanceOf, isUniqueViolation, lockUser } from "@/lib/db/ledger"
import { getUserId } from "@/lib/session"
import { spin, ticket, transaction } from "@/lib/db/schema"
import {
  WELCOME_BONUS,
  WHEEL_SEGMENTS,
  formatNumbers,
  getGame,
  minskDayKey,
  pickWeighted,
  playInstant,
  randomNumbers,
  validateNumbers,
} from "@/lib/lottery"
import { newSeed, secureRng, seededRng } from "@/lib/random"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { logActivity } from "@/lib/visitors"
import { formatByn, notify } from "@/lib/notifications"
import { bestOf } from "@/lib/luck"
import { getLuckAttempts } from "@/lib/luck-server"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string }

export async function getBalance() {
  return balanceOf(db, await getUserId())
}

export async function getTransactions() {
  const userId = await getUserId()
  return db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .orderBy(desc(transaction.createdAt))
    .limit(50)
}

export type TicketRow = {
  id: number
  game: string
  numbers: string
  cost: number
  status: string
  matches: number
  prize: number
  createdAt: Date
  winningNumbers: string | null
  details: unknown
}

export async function getTickets(): Promise<TicketRow[]> {
  const userId = await getUserId()
  return db
    .select({
      id: ticket.id,
      game: ticket.game,
      numbers: ticket.numbers,
      cost: ticket.cost,
      status: ticket.status,
      matches: ticket.matches,
      prize: ticket.prize,
      createdAt: ticket.createdAt,
      winningNumbers: ticket.winningNumbers,
      details: ticket.details,
    })
    .from(ticket)
    .where(eq(ticket.userId, userId))
    .orderBy(desc(ticket.createdAt))
    .limit(50)
}

export async function getSpinStatus() {
  const userId = await getUserId()
  const [today] = await db
    .select({ segment: spin.segment, amount: spin.amount })
    .from(spin)
    .where(and(eq(spin.userId, userId), eq(spin.day, minskDayKey())))
    .limit(1)
  return { spunToday: Boolean(today), todaySegment: today?.segment ?? null, todayAmount: today?.amount ?? null }
}

// Sentinels used to abort a db.transaction and surface a friendly error.
class InsufficientFundsError extends Error {}
class AlreadyClaimedError extends Error {}

export type InstantResult = {
  ticketId: number
  game: string
  numbers: number[]
  winning: number[]
  matches: number
  prize: number
  balance: number
}

/**
 * Buys an instant ticket: charges the cost, draws the winning combination
 * with a CSPRNG and pays the prize — all in one transaction, so the player
 * learns the outcome immediately. Without `numbers` a random pick is used.
 */
export async function buyTicket(gameId: string, numbers?: number[]): Promise<ActionResult<InstantResult>> {
  const userId = await getUserId()

  const game = getGame(gameId)
  if (!game) return { ok: false, error: "Неизвестная игра" }
  if (!(await allowUserAction(userId, "buyTicket"))) return { ok: false, error: RATE_LIMIT_ERROR }

  let picked: number[]
  if (numbers === undefined) {
    picked = randomNumbers(game.pick, game.max, secureRng)
  } else {
    const valid = validateNumbers(game, numbers)
    if (!valid) return { ok: false, error: `Отметьте ровно ${game.pick} ${game.pick < 5 ? "разных числа" : "разных чисел"} от 1 до ${game.max}` }
    picked = valid
  }

  const luck = await getLuckAttempts()

  try {
    const result = await db.transaction(async (tx) => {
      await lockUser(tx, userId)
      const before = await balanceOf(tx, userId)
      if (before < game.cost) throw new InsufficientFundsError()

      const seed = newSeed()
      const outcome = bestOf(luck, seededRng(seed), (r) => playInstant(game, picked, r), (o) => o.prize)
      const status = outcome.prize > 0 ? "win" : "lose"

      const [created] = await tx
        .insert(ticket)
        .values({
          userId,
          game: game.name,
          numbers: formatNumbers(picked),
          winningNumbers: formatNumbers(outcome.winning),
          cost: game.cost,
          status,
          matches: outcome.matches,
          prize: outcome.prize,
          seed,
          details: { luck },
        })
        .returning({ id: ticket.id })

      await tx.insert(transaction).values({
        userId,
        type: "purchase",
        amount: -game.cost,
        description: `Билет «${game.name}» #${created.id}`,
      })
      if (outcome.prize > 0) {
        await tx.insert(transaction).values({
          userId,
          type: "prize",
          amount: outcome.prize,
          description: `Выигрыш: билет «${game.name}» #${created.id}, ${outcome.matches} из ${game.pick}`,
        })
      }

      return {
        ticketId: created.id,
        game: game.name,
        numbers: picked,
        winning: outcome.winning,
        matches: outcome.matches,
        prize: outcome.prize,
        balance: before - game.cost + outcome.prize,
      }
    })
    await logActivity("game", `Билет «${result.game}»: ставка ${game.cost} BYN, выигрыш ${result.prize} BYN`)
    revalidatePath("/cabinet"); revalidatePath("/play", "layout")
    return { ok: true, ...result }
  } catch (e) {
    if (e instanceof InsufficientFundsError) return { ok: false, error: "Недостаточно средств на балансе" }
    throw e
  }
}

export async function claimWelcomeBonus(): Promise<ActionResult> {
  const userId = await getUserId()
  if (!(await allowUserAction(userId, "welcome"))) return { ok: false, error: RATE_LIMIT_ERROR }

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: transaction.id })
        .from(transaction)
        .where(and(eq(transaction.userId, userId), eq(transaction.type, "welcome")))
        .limit(1)
      if (existing.length > 0) throw new AlreadyClaimedError()

      await tx.insert(transaction).values({
        userId,
        type: "welcome",
        amount: WELCOME_BONUS,
        description: "Приветственный бонус",
      })
      await notify(tx, userId, {
        kind: "bonus",
        title: `Приветственный бонус: +${formatByn(WELCOME_BONUS)}`,
        body: "Бонус уже на балансе — выбирайте игру и забирайте первый выигрыш.",
        href: "/play",
      })
    })
  } catch (e) {
    // A duplicate insert racing past the check trips the partial unique index.
    if (e instanceof AlreadyClaimedError || isUniqueViolation(e)) {
      return { ok: false, error: "Бонус уже получен" }
    }
    throw e
  }

  await logActivity("bonus", `Получил приветственный бонус ${WELCOME_BONUS} BYN`)
  revalidatePath("/cabinet"); revalidatePath("/play", "layout")
  return { ok: true }
}

/** One free spin per Minsk calendar day; the prize is picked server-side. */
export async function spinWheel(): Promise<ActionResult<{ segment: number; amount: number }>> {
  const userId = await getUserId()
  if (!(await allowUserAction(userId, "spin"))) return { ok: false, error: RATE_LIMIT_ERROR }
  const day = minskDayKey()
  const luck = await getLuckAttempts()
  const segment = bestOf(luck, secureRng, (r) => pickWeighted(WHEEL_SEGMENTS, r), (i) => WHEEL_SEGMENTS[i].amount)
  const { amount, label } = WHEEL_SEGMENTS[segment]

  try {
    await db.transaction(async (tx) => {
      await tx.insert(spin).values({ userId, day, segment, amount })
      await tx.insert(transaction).values({
        userId,
        type: "spin",
        amount,
        description: `Колесо фортуны: ${label}`,
      })
    })
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "Сегодня вы уже крутили колесо. Возвращайтесь завтра!" }
    throw e
  }

  await logActivity("bonus", `Колесо фортуны: ${label}`)
  revalidatePath("/cabinet"); revalidatePath("/play", "layout")
  return { ok: true, segment, amount }
}
