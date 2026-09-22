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

function randomNumbers(count: number, max: number) {
  const set = new Set<number>()
  while (set.size < count) set.add(Math.floor(Math.random() * max) + 1)
  return [...set].sort((a, b) => a - b)
}

export async function buyTicket(game: string) {
  const userId = await getUserId()
  const cost = GAME_COST[game] ?? 2

  const balance = await getBalance()
  if (balance < cost) {
    return { ok: false as const, error: "Недостаточно бонусов на балансе" }
  }

  const numbers = randomNumbers(6, 45).join(", ")
  const drawAt = new Date(Date.now() + 1000 * 60 * 60 * 24)

  await db.insert(ticket).values({
    userId,
    game,
    numbers,
    cost,
    status: "pending",
    drawAt,
  })

  await db.insert(transaction).values({
    userId,
    type: "purchase",
    amount: -cost,
    description: `Покупка билета «${game}»`,
  })

  revalidatePath("/cabinet")
  return { ok: true as const }
}

export async function claimWelcomeBonus() {
  const userId = await getUserId()
  const existing = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(and(eq(transaction.userId, userId), eq(transaction.type, "welcome")))
    .limit(1)

  if (existing.length > 0) {
    return { ok: false as const, error: "Бонус уже получен" }
  }

  await db.insert(transaction).values({
    userId,
    type: "welcome",
    amount: 20,
    description: "Приветственный бонус",
  })

  revalidatePath("/cabinet")
  return { ok: true as const }
}
