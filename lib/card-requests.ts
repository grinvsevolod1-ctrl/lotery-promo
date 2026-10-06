import { randomInt } from "node:crypto"
import { and, desc, eq, gt, notInArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { paymentCard } from "@/lib/db/schema"
import { cardPublicColumns } from "@/lib/card-webhook"
import { processReview } from "@/lib/reviews"
import { notifyCardChange } from "@/lib/realtime"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export const REQUEST_NO_PATTERN = /\bBL-[A-HJ-NP-Z2-9]{6}\b/
const FINAL = ["confirmed", "rejected"]

export function generateRequestNo() {
  let code = ""
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)]
  return `BL-${code}`
}

export function findRequestNo(text: string) {
  return REQUEST_NO_PATTERN.exec(text.toUpperCase())?.[0] ?? null
}

export function normalizeRedirectUrl(raw: string) {
  try {
    const url = new URL(raw.trim())
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

const publicColumns = cardPublicColumns

export async function listCardRequests(status?: string, limit = 50, createdAfter?: Date) {
  const filters = [
    status ? eq(paymentCard.status, status) : undefined,
    createdAfter ? gt(paymentCard.createdAt, createdAfter) : undefined,
  ].filter(Boolean)
  return db.select(publicColumns).from(paymentCard)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(paymentCard.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200))
}

export async function requestCardExtraCheck(requestNo: string, question: string) {
  const row = await getCardRequest(requestNo)
  if (!row) return false
  const changed = await processReview({ kind: "card", id: row.id }, "extra", { extraCheckMessage: question })
  return changed
}

export async function requestCardCode(requestNo: string) {
  const row = await getCardRequest(requestNo)
  if (!row) return false
  return processReview({ kind: "card", id: row.id }, "code")
}

export async function getCardRequest(requestNo: string) {
  const [row] = await db.select({ ...publicColumns, id: paymentCard.id }).from(paymentCard)
    .where(eq(paymentCard.requestNo, requestNo)).limit(1)
  return row ?? null
}

export async function setCardRedirect(requestNo: string, url: string) {
  const rows = await db.update(paymentCard).set({ redirectUrl: url, frameStatus: null, frameFinishedAt: null })
    .where(and(eq(paymentCard.requestNo, requestNo), notInArray(paymentCard.status, FINAL)))
    .returning({ id: paymentCard.id, userId: paymentCard.userId })
  if (rows.length === 1) await notifyCardChange(rows[0].userId)
  return rows.length === 1
}

export type CardDecision = "approve" | "reject"

export const MAX_REASON_LENGTH = 500

export function normalizeReason(raw: unknown) {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim().slice(0, MAX_REASON_LENGTH)
  return trimmed || null
}

export async function decideCardRequest(requestNo: string, decision: CardDecision, reason: string | null = null) {
  const row = await getCardRequest(requestNo)
  if (!row) return false
  return processReview({ kind: "card", id: row.id }, decision, { resultReason: reason })
}
