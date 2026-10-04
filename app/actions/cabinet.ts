"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
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
import { secureRng } from "@/lib/random"
import { and, desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string }

export async function getBalance() {
  const userId = await getUserId()
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${transaction.amount}), 0)` })
    .from(transaction)
    .where(eq(transaction.userId, userId))
  return Number(rows[0]?.total ?? 0)
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

function isUniqueViolation(e: unknown) {
  return e instanceof Error && /unique|duplicate/i.test(e.message)
}

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

  let picked: number[]
  if (numbers === undefined) {
    picked = randomNumbers(game.pick, game.max, secureRng)
  } else {
    const valid = validateNumbers(game, numbers)
    if (!valid) return { ok: false, error: `Отметьте ровно ${game.pick} разных чисел от 1 до ${game.max}` }
    picked = valid
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Serialise purchases of one user so two parallel tickets cannot both
      // pass the balance check with money for only one.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)

      const rows = await tx
        .select({ total: sql<number>`coalesce(sum(${transaction.amount}), 0)` })
        .from(transaction)
        .where(eq(transaction.userId, userId))
      const before = Number(rows[0]?.total ?? 0)
      if (before < game.cost) throw new InsufficientFundsError()

      const outcome = playInstant(game, picked, secureRng)
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
    revalidatePath("/cabinet")
    return { ok: true, ...result }
  } catch (e) {
    if (e instanceof InsufficientFundsError) return { ok: false, error: "Недостаточно средств на балансе" }
    throw e
  }
}

export async function claimWelcomeBonus(): Promise<ActionResult> {
  const userId = await getUserId()

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
    })
  } catch (e) {
    // A duplicate insert racing past the check trips the partial unique index.
    if (e instanceof AlreadyClaimedError || isUniqueViolation(e)) {
      return { ok: false, error: "Бонус уже получен" }
    }
    throw e
  }

  revalidatePath("/cabinet")
  return { ok: true }
}

/** One free spin per Minsk calendar day; the prize is picked server-side. */
export async function spinWheel(): Promise<ActionResult<{ segment: number; amount: number }>> {
  const userId = await getUserId()
  const day = minskDayKey()
  const segment = pickWeighted(WHEEL_SEGMENTS, secureRng)
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

  revalidatePath("/cabinet")
  return { ok: true, segment, amount }
}
