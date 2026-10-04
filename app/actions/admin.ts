"use server"

import { and, desc, eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { paymentCard, referral, user } from "@/lib/db/schema"
import { processReview } from "@/lib/reviews"
import type { ReviewDecision, ReviewTarget } from "@/lib/telegram-security"
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
  return db.select({
    id: paymentCard.id, brand: paymentCard.brand, last4: paymentCard.last4, bankName: paymentCard.bankName,
    cardholder: paymentCard.cardholder, createdAt: paymentCard.createdAt,
    userName: user.name, userEmail: user.email,
  }).from(paymentCard).innerJoin(user, eq(user.id, paymentCard.userId))
    .where(eq(paymentCard.status, "pending")).orderBy(desc(paymentCard.createdAt)).limit(100)
}

async function review(target: ReviewTarget, decision: ReviewDecision) {
  await requireAdmin()
  const changed = await processReview(target, decision)
  revalidatePath("/admin")
  revalidatePath("/cabinet", "layout")
  if (changed) void notifyTelegram(`<b>Приглашение #${target.id}</b>\n${decision === "approve" ? "Подтверждено" : "Отклонено"}.`)
  return changed
}

function validCardId(id: number) {
  return Number.isInteger(id) && id > 0 && id <= 2147483647
}

async function finishCard(id: number, status: "confirmed" | "rejected") {
  await requireAdmin()
  if (!validCardId(id)) return
  const changed = await db.transaction(async (tx) => {
    const [row] = await tx.update(paymentCard).set({ status, processedAt: new Date() })
      .where(and(eq(paymentCard.id, id), eq(paymentCard.status, "pending")))
      .returning({ userId: paymentCard.userId, last4: paymentCard.last4 })
    if (!row) return null
    if (status === "confirmed") {
      const [existingDefault] = await tx.select({ id: paymentCard.id }).from(paymentCard)
        .where(and(eq(paymentCard.userId, row.userId), eq(paymentCard.isDefault, true))).limit(1)
      if (!existingDefault) await tx.update(paymentCard).set({ isDefault: true }).where(eq(paymentCard.id, id))
    }
    return row
  })
  revalidatePath("/admin")
  revalidatePath("/cabinet/cards")
  if (changed) void notifyTelegram(`<b>Карта #${id}</b> •••• ${changed.last4}\n${status === "confirmed" ? "Привязана" : "Отклонена"}.`)
}

export async function confirmCard(id: number) {
  await finishCard(id, "confirmed")
}

export async function rejectCard(id: number) {
  await finishCard(id, "rejected")
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
  return []
}

export async function approveFundingRequest(id: number) {
  await review({ kind: "funding", id }, "approve")
}

export async function rejectFundingRequest(id: number) {
  await review({ kind: "funding", id }, "reject")
}

export async function getPendingReferrals() {
  await requireAdmin()
  return db.select({ id: referral.id, createdAt: referral.createdAt }).from(referral).where(eq(referral.status, "pending")).orderBy(desc(referral.createdAt)).limit(100)
}

export async function reviewReferral(id: number, decision: ReviewDecision) {
  return review({ kind: "referral", id }, decision)
}
