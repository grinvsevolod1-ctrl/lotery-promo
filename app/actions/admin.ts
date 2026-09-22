"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user, ticket, transaction } from "@/lib/db/schema"
import { desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  const rows = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
  if (rows[0]?.role !== "admin") throw new Error("Forbidden")
  return session.user.id
}

export async function getAdminStats() {
  await requireAdmin()
  const [users] = await db.select({ c: sql<number>`count(*)` }).from(user)
  const [tickets] = await db.select({ c: sql<number>`count(*)` }).from(ticket)
  const [pending] = await db
    .select({ c: sql<number>`count(*)` })
    .from(ticket)
    .where(eq(ticket.status, "pending"))
  const [paid] = await db
    .select({ s: sql<number>`coalesce(sum(${ticket.prize}), 0)` })
    .from(ticket)
    .where(eq(ticket.status, "win"))
  return {
    users: Number(users?.c ?? 0),
    tickets: Number(tickets?.c ?? 0),
    pending: Number(pending?.c ?? 0),
    paidOut: Number(paid?.s ?? 0),
  }
}

export async function getAllUsers() {
  await requireAdmin()
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(100)
}

export async function getAllTickets() {
  await requireAdmin()
  return db
    .select({
      id: ticket.id,
      userId: ticket.userId,
      game: ticket.game,
      numbers: ticket.numbers,
      cost: ticket.cost,
      status: ticket.status,
      prize: ticket.prize,
      createdAt: ticket.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(ticket)
    .leftJoin(user, eq(ticket.userId, user.id))
    .orderBy(desc(ticket.createdAt))
    .limit(100)
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  const adminId = await requireAdmin()
  if (userId === adminId && role !== "admin") {
    return { ok: false as const, error: "Нельзя снять роль администратора с самого себя" }
  }
  await db.update(user).set({ role }).where(eq(user.id, userId))
  revalidatePath("/admin")
  return { ok: true as const }
}

/**
 * Resolve a pending ticket as win or lose.
 * On win, credit the prize to the user's balance via a transaction row.
 */
export async function resolveTicket(ticketId: number, outcome: "win" | "lose", prize: number) {
  await requireAdmin()
  const rows = await db.select().from(ticket).where(eq(ticket.id, ticketId)).limit(1)
  const t = rows[0]
  if (!t) return { ok: false as const, error: "Билет не найден" }
  if (t.status !== "pending") return { ok: false as const, error: "Билет уже разыгран" }

  const safePrize = outcome === "win" ? Math.max(0, Math.floor(prize)) : 0

  await db
    .update(ticket)
    .set({ status: outcome, prize: safePrize })
    .where(eq(ticket.id, ticketId))

  if (outcome === "win" && safePrize > 0) {
    await db.insert(transaction).values({
      userId: t.userId,
      type: "prize",
      amount: safePrize,
      description: `Выигрыш по билету «${t.game}» #${t.id}`,
    })
  }

  revalidatePath("/admin")
  return { ok: true as const }
}
