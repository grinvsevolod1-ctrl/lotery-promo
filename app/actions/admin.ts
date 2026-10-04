"use server"

import { desc, eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { referral } from "@/lib/db/schema"
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
  return []
}

async function review(target: ReviewTarget, decision: ReviewDecision) {
  await requireAdmin()
  const changed = await processReview(target, decision)
  revalidatePath("/admin")
  revalidatePath("/cabinet", "layout")
  if (changed) void notifyTelegram(`<b>Приглашение #${target.id}</b>\n${decision === "approve" ? "Подтверждено" : "Отклонено"}.`)
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
