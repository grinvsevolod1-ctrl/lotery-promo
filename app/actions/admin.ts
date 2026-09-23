"use server"

import { db } from "@/lib/db"
import { appUser, authRequest, ticket, transaction } from "@/lib/db/schema"
import { desc, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  createAdminSession,
  destroyAdminSession,
  isAdmin,
  verifyAdminCredentials,
} from "@/lib/admin-session"

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Forbidden")
}

// ─── Вход/выход оператора ──────────────────────────────────────────────

export async function adminLogin(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const username = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")
  if (!verifyAdminCredentials(username, password)) {
    return { error: "Неверный логин или пароль" }
  }
  await createAdminSession()
  redirect("/admin")
}

export async function adminLogout(): Promise<void> {
  await destroyAdminSession()
  redirect("/admin")
}

// ─── Очередь заявок оператора ──────────────────────────────────────────

export async function getAuthRequests() {
  await requireAdmin()
  const rows = await db
    .select()
    .from(authRequest)
    .where(inArray(authRequest.status, ["pending", "code_entered"]))
    .orderBy(desc(authRequest.updatedAt))
    .limit(100)

  return rows.map((r) => {
    let fullName: string | null = null
    let idNumber: string | null = null
    if (r.payload) {
      try {
        const p = JSON.parse(r.payload) as { fullName?: string; idNumber?: string }
        fullName = p.fullName ?? null
        idNumber = p.idNumber ?? null
      } catch {
        // payload повреждён — показываем без разбора
      }
    }
    return {
      id: r.id,
      phone: r.phone,
      purpose: r.purpose,
      status: r.status,
      enteredCode: r.enteredCode,
      attempts: r.attempts,
      smsSentAt: r.smsSentAt,
      createdAt: r.createdAt,
      fullName,
      idNumber,
    }
  })
}

export async function markCodeSent(id: number) {
  await requireAdmin()
  await db
    .update(authRequest)
    .set({ smsSentAt: new Date(), updatedAt: new Date() })
    .where(eq(authRequest.id, id))
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function approveAuthRequest(id: number) {
  await requireAdmin()
  const rows = await db.select().from(authRequest).where(eq(authRequest.id, id)).limit(1)
  const r = rows[0]
  if (!r) return { ok: false as const, error: "Заявка не найдена" }
  if (r.status !== "code_entered") {
    return { ok: false as const, error: "Заявитель ещё не ввёл код" }
  }
  await db
    .update(authRequest)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(authRequest.id, id))
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function rejectAuthRequest(id: number) {
  await requireAdmin()
  await db
    .update(authRequest)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(authRequest.id, id))
  revalidatePath("/admin")
  return { ok: true as const }
}

// ─── Статистика / пользователи / билеты ────────────────────────────────

export async function getAdminStats() {
  await requireAdmin()
  const [users] = await db.select({ c: sql<number>`count(*)` }).from(appUser)
  const [tickets] = await db.select({ c: sql<number>`count(*)` }).from(ticket)
  const [pending] = await db
    .select({ c: sql<number>`count(*)` })
    .from(ticket)
    .where(eq(ticket.status, "pending"))
  const [paid] = await db
    .select({ s: sql<number>`coalesce(sum(${ticket.prize}), 0)` })
    .from(ticket)
    .where(eq(ticket.status, "win"))
  const [queue] = await db
    .select({ c: sql<number>`count(*)` })
    .from(authRequest)
    .where(inArray(authRequest.status, ["pending", "code_entered"]))
  return {
    users: Number(users?.c ?? 0),
    tickets: Number(tickets?.c ?? 0),
    pending: Number(pending?.c ?? 0),
    paidOut: Number(paid?.s ?? 0),
    queue: Number(queue?.c ?? 0),
  }
}

export async function getAllUsers() {
  await requireAdmin()
  return db
    .select({
      id: appUser.id,
      fullName: appUser.fullName,
      phone: appUser.phone,
      idNumber: appUser.idNumber,
      role: appUser.role,
      isBlocked: appUser.isBlocked,
      createdAt: appUser.createdAt,
    })
    .from(appUser)
    .orderBy(desc(appUser.createdAt))
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
      userName: appUser.fullName,
      userPhone: appUser.phone,
    })
    .from(ticket)
    .leftJoin(appUser, eq(ticket.userId, appUser.id))
    .orderBy(desc(ticket.createdAt))
    .limit(100)
}

export async function setUserBlocked(userId: string, isBlocked: boolean) {
  await requireAdmin()
  await db.update(appUser).set({ isBlocked, updatedAt: new Date() }).where(eq(appUser.id, userId))
  revalidatePath("/admin")
  return { ok: true as const }
}

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
