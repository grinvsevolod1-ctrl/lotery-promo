"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { draw, spin, ticket, transaction } from "@/lib/db/schema"
import { getOrCreateNextDraw } from "@/lib/draws"
import {
  WELCOME_BONUS,
  WHEEL_SEGMENTS,
  formatNumbers,
  gameCost,
  minskDayKey,
  pickWeighted,
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
  drawId: number
  game: string
  numbers: string
  cost: number
  status: string
  matches: number
  prize: number
  createdAt: Date
  drawAt: Date
  winningNumbers: string | null
}

export async function getTickets(): Promise<TicketRow[]> {
  const userId = await getUserId()
  return db
    .select({
      id: ticket.id,
      drawId: ticket.drawId,
      game: ticket.game,
      numbers: ticket.numbers,
      cost: ticket.cost,
      status: ticket.status,
      matches: ticket.matches,
      prize: ticket.prize,
      createdAt: ticket.createdAt,
      drawAt: draw.drawAt,
      winningNumbers: draw.winningNumbers,
    })
    .from(ticket)
    .innerJoin(draw, eq(ticket.drawId, draw.id))
    .where(eq(ticket.userId, userId))
    .orderBy(desc(ticket.createdAt))
    .limit(100)
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
class DrawClosedError extends Error {}

function isUniqueViolation(e: unknown) {
  return e instanceof Error && /unique|duplicate/i.test(e.message)
}

/**
 * Buys a ticket for the next draw. `numbers` is the player's own pick
 * (6 distinct numbers 1..45); when omitted a random combination is used.
 */
export async function buyTicket(game: string, numbers?: number[]): Promise<ActionResult<{ ticketId: number }>> {
  const userId = await getUserId()

  const cost = gameCost(game)
  if (cost === null) return { ok: false, error: "Неизвестная игра" }

  let picked: number[]
  if (numbers === undefined) {
    picked = randomNumbers(undefined, undefined, secureRng)
  } else {
    const valid = validateNumbers(numbers)
    if (!valid) return { ok: false, error: "Выберите ровно 6 разных чисел от 1 до 45" }
    picked = valid
  }

  const purchase = async () => {
    const nextDraw = await getOrCreateNextDraw()

    return db.transaction(async (tx) => {
      // A shared lock on the draw row waits for an in-flight settlement (which
      // holds FOR UPDATE) and guarantees the ticket lands in an open draw.
      const [locked] = await tx
        .select({ status: draw.status })
        .from(draw)
        .where(eq(draw.id, nextDraw.id))
        .for("share")
      if (!locked || locked.status !== "scheduled") throw new DrawClosedError()

      const rows = await tx
        .select({ total: sql<number>`coalesce(sum(${transaction.amount}), 0)` })
        .from(transaction)
        .where(eq(transaction.userId, userId))
      const balance = Number(rows[0]?.total ?? 0)
      if (balance < cost) throw new InsufficientFundsError()

      const [created] = await tx
        .insert(ticket)
        .values({ userId, drawId: nextDraw.id, game, numbers: formatNumbers(picked), cost, status: "pending" })
        .returning({ id: ticket.id })
      await tx.insert(transaction).values({
        userId,
        type: "purchase",
        amount: -cost,
        description: `Покупка билета «${game}» #${created.id}`,
      })
      return created.id
    })
  }

  try {
    let ticketId: number
    try {
      ticketId = await purchase()
    } catch (e) {
      // The draw closed between selecting it and locking it: retry once with the next one.
      if (!(e instanceof DrawClosedError)) throw e
      ticketId = await purchase()
    }
    revalidatePath("/cabinet")
    return { ok: true, ticketId }
  } catch (e) {
    if (e instanceof InsufficientFundsError) return { ok: false, error: "Недостаточно бонусов на балансе" }
    if (e instanceof DrawClosedError) return { ok: false, error: "Приём билетов на тираж закрыт, попробуйте ещё раз" }
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
