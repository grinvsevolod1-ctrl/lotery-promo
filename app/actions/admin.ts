"use server"

import { and, desc, eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, referral, user } from "@/lib/db/schema"
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

async function review(target: ReviewTarget, decision: ReviewDecision) {
  await requireAdmin()
  const changed = await processReview(target, decision)
  revalidatePath("/admin")
  revalidatePath("/cabinet", "layout")
  if (changed) void notifyTelegram(`<b>Тестовая заявка #${target.id}</b>\n${decision === "approve" ? "Подтверждена" : "Отклонена"}. Реальных платежей нет.`)
  return changed
}

export async function confirmCard(id: number) {
  await review({ kind: "card", id }, "approve")
}

export async function rejectCard(id: number) {
  await review({ kind: "card", id }, "reject")
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
    .where(and(eq(fundingRequest.status, "pending"), eq(fundingRequest.note, "demo-only")))
    .orderBy(desc(fundingRequest.createdAt))
  return rows
}

// Withdrawals were already debited by a `withdrawal_hold` transaction when requested.
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
