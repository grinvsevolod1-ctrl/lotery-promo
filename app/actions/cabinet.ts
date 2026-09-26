"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ticket, transaction } from "@/lib/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

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

export async function getTickets() {
  const userId = await getUserId()
  return db
    .select()
    .from(ticket)
    .where(eq(ticket.userId, userId))
    .orderBy(desc(ticket.createdAt))
}

const GAME_COST: Record<string, number> = {
  "Суперлото": 3,
  "Пятёрочка": 2,
  "КЕНО": 1,
}

// Sentinels used to abort a db.transaction and surface a friendly error.
class InsufficientFundsError extends Error {}
class AlreadyClaimedError extends Error {}

function randomNumbers(count: number, max: number) {
  const set = new Set<number>()
  while (set.size < count) set.add(Math.floor(Math.random() * max) + 1)
  return [...set].sort((a, b) => a - b)
}

export async function buyTicket(game: string) {
  const userId = await getUserId()

  if (!Object.prototype.hasOwnProperty.call(GAME_COST, game)) {
    return { ok: false as const, error: "Неизвестная игра" }
  }
  const cost = GAME_COST[game]

  const numbers = randomNumbers(6, 45).join(", ")
  const drawAt = new Date(Date.now() + 1000 * 60 * 60 * 24)

  try {
    await db.transaction(async (tx) => {
      const rows = await tx
        .select({ total: sql<number>`coalesce(sum(${transaction.amount}), 0)` })
        .from(transaction)
        .where(eq(transaction.userId, userId))
      const balance = Number(rows[0]?.total ?? 0)
      if (balance < cost) throw new InsufficientFundsError()

      await tx.insert(ticket).values({
        userId,
        game,
        numbers,
        cost,
        status: "pending",
        drawAt,
      })
      await tx.insert(transaction).values({
        userId,
        type: "purchase",
        amount: -cost,
        description: `Покупка билета «${game}»`,
      })
    })
  } catch (e) {
    if (e instanceof InsufficientFundsError) {
      return { ok: false as const, error: "Недостаточно бонусов на балансе" }
    }
    throw e
  }

  revalidatePath("/cabinet")
  return { ok: true as const }
}

export async function claimWelcomeBonus() {
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
        amount: 20,
        description: "Приветственный бонус",
      })
    })
  } catch (e) {
    if (e instanceof AlreadyClaimedError) {
      return { ok: false as const, error: "Бонус уже получен" }
    }
    // A duplicate insert racing past the check trips the partial unique index.
    if (e instanceof Error && /unique|duplicate/i.test(e.message)) {
      return { ok: false as const, error: "Бонус уже получен" }
    }
    throw e
  }

  revalidatePath("/cabinet")
  return { ok: true as const }
}
