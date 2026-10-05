import { createHmac, randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { paymentCard } from "@/lib/db/schema"
import { SETTING_KEYS, getSetting, setSetting } from "@/lib/settings"

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
  | "ping"

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

export type DeliveryResult = {
  ok: boolean
  event: string
  status: number | null
  error: string | null
  at: string
}

/** Returns the URL if it is a valid https URL, otherwise null. */
export function normalizeWebhookUrl(raw: string | null | undefined) {
  const value = raw?.trim()
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" && value.length <= 500 ? url.toString() : null
  } catch {
    return null
  }
}

/** URL set in the admin panel wins over the CARD_WEBHOOK_URL env var. */
export async function webhookUrl() {
  const fromDb = await getSetting(SETTING_KEYS.cardWebhookUrl).catch(() => null)
  return normalizeWebhookUrl(fromDb) ?? normalizeWebhookUrl(process.env.CARD_WEBHOOK_URL)
}

export async function lastDelivery(): Promise<DeliveryResult | null> {
  const raw = await getSetting(SETTING_KEYS.cardWebhookLastDelivery).catch(() => null)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DeliveryResult
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

async function attempt(url: string, body: string, secret: string, event: CardEvent, eventId: string) {
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
    return { status: response.status, error: response.ok ? null : `HTTP ${response.status}` }
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "Таймаут 8 с" : "Сервис недоступен"
    return { status: null, error: message }
  }
}

async function recordDelivery(result: DeliveryResult) {
  await setSetting(SETTING_KEYS.cardWebhookLastDelivery, JSON.stringify(result)).catch(() => {})
}

async function deliver(url: string, body: string, secret: string, event: CardEvent, eventId: string, retries = RETRY_DELAYS_MS) {
  let last: { status: number | null; error: string | null } = { status: null, error: "Не отправлено" }
  for (const delay of retries) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    last = await attempt(url, body, secret, event, eventId)
    if (!last.error) break
    if (last.status && last.status >= 400 && last.status < 500 && last.status !== 429) break
  }
  const result: DeliveryResult = { ok: !last.error, event, status: last.status, error: last.error, at: new Date().toISOString() }
  await recordDelivery(result)
  if (!result.ok) console.error(`[card-webhook] delivery failed: ${event} ${eventId} ${last.error}`)
  return result
}

/** Fire-and-forget: notifies the verification service about a change in a card request. */
export function emitCardEvent(cardId: number, event: CardEvent, data?: Record<string, string>) {
  const secret = process.env.OPERATOR_API_KEY?.trim()
  if (!secret) return
  void (async () => {
    try {
      const url = await webhookUrl()
      if (!url) return
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

/** Sends a single signed `ping` event and waits for the answer — used by the admin "Test" button. */
export async function sendTestWebhook(): Promise<DeliveryResult> {
  const secret = process.env.OPERATOR_API_KEY?.trim()
  const url = await webhookUrl()
  const at = new Date().toISOString()
  if (!secret) return { ok: false, event: "ping", status: null, error: "На сервере не задан OPERATOR_API_KEY", at }
  if (!url) return { ok: false, event: "ping", status: null, error: "Адрес сервиса не указан", at }
  const eventId = randomUUID()
  const body = JSON.stringify({ id: eventId, event: "ping", createdAt: at, data: {}, request: null })
  return deliver(url, body, secret, "ping", eventId, [0])
}
