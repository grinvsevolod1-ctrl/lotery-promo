import { createHmac, timingSafeEqual } from "node:crypto"

export type ReviewKind = "card" | "funding" | "referral"
export type ReviewDecision = "approve" | "reject" | "code" | "extra" | "checkout"
export type ReviewTarget = { kind: ReviewKind; id: number }

function signature(value: string) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) throw new Error("Missing admin secret")
  return createHmac("sha256", secret).update(`telegram-review:${value}`).digest("hex").slice(0, 24)
}

export function safeEqual(actual: string, expected: string) {
  const a = Buffer.from(actual)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function callbackData(target: ReviewTarget, decision: ReviewDecision) {
  const value = `v1:${target.kind}:${target.id}:${decision}`
  return `${value}:${signature(value)}`
}

export function parseCallback(data: string): (ReviewTarget & { decision: ReviewDecision }) | null {
  const match = /^v1:(card|funding|referral):([1-9]\d{0,9}):(approve|reject|code|extra|checkout):([a-f0-9]{24})$/.exec(data)
  if (!match) return null
  const [, kind, rawId, decision, sig] = match
  const id = Number(rawId)
  if (id > 2147483647 || !safeEqual(sig, signature(`v1:${kind}:${rawId}:${decision}`))) return null
  return { kind: kind as ReviewKind, id, decision: decision as ReviewDecision }
}

export function webhookSecret() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  return createHmac("sha256", token).update("toloto-telegram-webhook-v1").digest("hex")
}

export function isPrivateAdmin(chat: { id: number; type?: string } | undefined, fromId: number | undefined) {
  const configured = process.env.TELEGRAM_CHAT_ID?.trim()
  return Boolean(configured && /^\d+$/.test(configured) && chat?.type === "private" && String(chat.id) === configured && String(fromId) === configured)
}
