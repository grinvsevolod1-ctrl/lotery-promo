"use server"

import { desc, eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, transaction, user } from "@/lib/db/schema"
import { clearAdminSession, isAdmin, setAdminSession, verifyAdminPassword } from "@/lib/admin-auth"
import { notifyTelegram } from "@/lib/telegram"

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login")
}

export async function adminLogin(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const valid = await verifyAdminPassword(password)
  if (!valid) return { ok: false, error: "Неверный пароль." }
  await setAdminSession()
  return { ok: true }
}

export async function adminLogout() {
  await clearAdminSession()
  redirect("/admin/login")
}

export type PendingCardRow = {
  id: number
  brand: string
  last4: string
  bankName: string | null
  cardholder: string
  createdAt: Date
  userName: string
  userEmail: string
}

export async function getPendingCards(): Promise<PendingCardRow[]> {
  await requireAdmin()
  const rows = await db
    .select({
      id: paymentCard.id,
      brand: paymentCard.brand,
      last4: paymentCard.last4,
      bankName: paymentCard.bankName,
      cardholder: paymentCard.cardholder,
      createdAt: paymentCard.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(paymentCard)
    .innerJoin(user, eq(paymentCard.userId, user.id))
    .where(eq(paymentCard.status, "pending"))
    .orderBy(desc(paymentCard.createdAt))
  return rows
}

export async function confirmCard(id: number) {
  await requireAdmin()
  await db.update(paymentCard).set({ status: "confirmed" }).where(eq(paymentCard.id, id))
  revalidatePath("/admin")
}

export async function rejectCard(id: number) {
  await requireAdmin()
  await db.update(paymentCard).set({ status: "rejected" }).where(eq(paymentCard.id, id))
  revalidatePath("/admin")
}

export type PendingFundingRow = {
  id: number
  type: string
  amount: number
  cardId: number | null
  createdAt: Date
  userName: string
  userEmail: string
  cardLast4: string | null
}

export async function getPendingFundingRequests(): Promise<PendingFundingRow[]> {
  await requireAdmin()
  const rows = await db
    .select({
      id: fundingRequest.id,
      type: fundingRequest.type,
      amount: fundingRequest.amount,
      cardId: fundingRequest.cardId,
      createdAt: fundingRequest.createdAt,
      userName: user.name,
      userEmail: user.email,
      cardLast4: paymentCard.last4,
    })
    .from(fundingRequest)
    .innerJoin(user, eq(fundingRequest.userId, user.id))
    .leftJoin(paymentCard, eq(fundingRequest.cardId, paymentCard.id))
    .where(eq(fundingRequest.status, "pending"))
    .orderBy(desc(fundingRequest.createdAt))
  return rows
}

export async function approveFundingRequest(id: number) {
  await requireAdmin()
  const [req] = await db.select().from(fundingRequest).where(eq(fundingRequest.id, id))
  if (!req || req.status !== "pending") return

  await db.transaction(async (tx) => {
    if (req.type === "deposit") {
      await tx.insert(transaction).values({
        userId: req.userId,
        type: "deposit",
        amount: req.amount,
        description: `Пополнение подтверждено (заявка #${req.id})`,
      })
    }
    // Withdrawals were already debited by a `withdrawal_hold` transaction when requested.
    await tx.update(fundingRequest).set({ status: "approved", processedAt: new Date() }).where(eq(fundingRequest.id, id))
  })

  void notifyTelegram(`<b>Заявка #${req.id} одобрена</b>\n${req.type === "deposit" ? "Пополнение" : "Вывод"}: ${req.amount} BYN`)
  revalidatePath("/admin")
}

export async function rejectFundingRequest(id: number) {
  await requireAdmin()
  const [req] = await db.select().from(fundingRequest).where(eq(fundingRequest.id, id))
  if (!req || req.status !== "pending") return

  await db.transaction(async (tx) => {
    if (req.type === "withdrawal") {
      await tx.insert(transaction).values({
        userId: req.userId,
        type: "withdrawal_refund",
        amount: req.amount,
        description: `Отклонена заявка на вывод #${req.id} — средства возвращены`,
      })
    }
    await tx.update(fundingRequest).set({ status: "rejected", processedAt: new Date() }).where(eq(fundingRequest.id, id))
  })

  void notifyTelegram(`<b>Заявка #${req.id} отклонена</b>\n${req.type === "deposit" ? "Пополнение" : "Вывод"}: ${req.amount} BYN`)
  revalidatePath("/admin")
}
