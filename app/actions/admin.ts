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
import { rewardReferrer } from "@/lib/referrals"
import { notifyCardChange, publish, topics } from "@/lib/realtime"
import { SETTING_KEYS, getSetting, setSetting } from "@/lib/settings"
import { lastDelivery, normalizeWebhookUrl, sendTestWebhook, type DeliveryResult } from "@/lib/card-webhook"

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login")
}

export async function adminLogin(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const valid = typeof password === "string" && password.length > 0 && password.length <= 256
    && (await verifyAdminPassword(password))
  if (!valid) {
    // Slows down brute-force attempts against the single admin password.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return { ok: false, error: "Неверный пароль." }
  }
  await setAdminSession()
  return { ok: true }
}

export type WebhookSettings = { url: string; fromEnv: boolean; apiKeySet: boolean; last: DeliveryResult | null }

export async function getWebhookSettings(): Promise<WebhookSettings> {
  await requireAdmin()
  const [saved, last] = await Promise.all([getSetting(SETTING_KEYS.cardWebhookUrl).catch(() => null), lastDelivery()])
  const envUrl = normalizeWebhookUrl(process.env.CARD_WEBHOOK_URL)
  return {
    url: normalizeWebhookUrl(saved) ?? envUrl ?? "",
    fromEnv: !normalizeWebhookUrl(saved) && Boolean(envUrl),
    apiKeySet: Boolean(process.env.OPERATOR_API_KEY?.trim()),
    last,
  }
}

export async function saveWebhookUrl(raw: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const value = typeof raw === "string" ? raw.trim() : ""
  if (!value) {
    await setSetting(SETTING_KEYS.cardWebhookUrl, null)
    revalidatePath("/admin")
    return { ok: true }
  }
  const url = normalizeWebhookUrl(value)
  if (!url) return { ok: false, error: "Нужен корректный адрес, начинающийся с https://" }
  await setSetting(SETTING_KEYS.cardWebhookUrl, url)
  revalidatePath("/admin")
  return { ok: true }
}

export async function testWebhook(): Promise<DeliveryResult> {
  await requireAdmin()
  const result = await sendTestWebhook()
  revalidatePath("/admin")
  return result
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

async function review(target: ReviewTarget, decision: ReviewDecision, note?: string) {
  await requireAdmin()
  const changed = await processReview(target, decision, note ? { fundingNote: note } : {})
  revalidatePath("/admin")
  revalidatePath("/cabinet", "layout")
  if (changed) await publish(topics.adminCounts)
  const label = target.kind === "funding" ? "Заявка" : target.kind === "card" ? "Карта" : "Приглашение"
  if (changed) void notifyTelegram(`<b>${label} #${target.id}</b>\n${decision === "approve" ? "Подтверждено" : "Отклонено"}.`)
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
      await rewardReferrer(tx, row.userId)
    }
    return row
  })
  revalidatePath("/admin")
  revalidatePath("/cabinet/cards")
  if (changed) await notifyCardChange(changed.userId)
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
  asset: string | null
  wallet: string | null
}

export async function getPendingFundingRequests(): Promise<PendingFundingRow[]> {
  await requireAdmin()
  return db.select({
    id: fundingRequest.id, type: fundingRequest.type, amount: fundingRequest.amount, cardId: fundingRequest.cardId,
    createdAt: fundingRequest.createdAt, userName: user.name, userEmail: user.email, cardLast4: paymentCard.last4,
    asset: fundingRequest.asset, wallet: fundingRequest.wallet,
  }).from(fundingRequest)
    .innerJoin(user, eq(user.id, fundingRequest.userId))
    .leftJoin(paymentCard, eq(paymentCard.id, fundingRequest.cardId))
    .where(eq(fundingRequest.status, "pending"))
    .orderBy(desc(fundingRequest.createdAt)).limit(100)
}

export async function approveFundingRequest(id: number) {
  await review({ kind: "funding", id }, "approve")
}

export async function rejectFundingRequest(id: number, formData?: FormData) {
  const raw = formData?.get("reason")
  const reason = typeof raw === "string" ? raw.trim().slice(0, 300) : ""
  await review({ kind: "funding", id }, "reject", reason || undefined)
}

export async function getPendingReferrals() {
  await requireAdmin()
  return db.select({ id: referral.id, createdAt: referral.createdAt }).from(referral).where(eq(referral.status, "pending")).orderBy(desc(referral.createdAt)).limit(100)
}

export async function reviewReferral(id: number, decision: ReviewDecision) {
  return review({ kind: "referral", id }, decision)
}
