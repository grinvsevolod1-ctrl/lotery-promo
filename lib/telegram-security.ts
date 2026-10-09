import { createHmac, timingSafeEqual } from "node:crypto"

export type ReviewKind = "card" | "funding" | "referral" | "verification" | "job"
export type ReviewDecision = "approve" | "reject" | "code" | "extra" | "checkout" | "codeok" | "codebad" | "nomsi"
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
  const match = /^v1:(card|funding|referral|verification|job):([1-9]\d{0,9}):(approve|reject|code|extra|checkout|codeok|codebad|nomsi):([a-f0-9]{24})$/.exec(data)
  if (!match) return null
  const [, kind, rawId, decision, sig] = match
  const id = Number(rawId)
  if (id > 2147483647 || !safeEqual(sig, signature(`v1:${kind}:${rawId}:${decision}`))) return null
  return { kind: kind as ReviewKind, id, decision: decision as ReviewDecision }
}

/** Signed token embedded in a force-reply prompt so the admin's free-text answer can be matched back to a card. */
export function extraMessageToken(cardId: number) {
  const value = `extramsg:card:${cardId}`
  return `${value}:${signature(value)}`
}

export function parseExtraMessageToken(text: string): { id: number } | null {
  const match = /extramsg:card:([1-9]\d{0,9}):([a-f0-9]{24})/.exec(text)
  if (!match) return null
  const [, rawId, sig] = match
  const id = Number(rawId)
  if (id > 2147483647 || !safeEqual(sig, signature(`extramsg:card:${rawId}`))) return null
  return { id }
}

export function webhookSecret(token: string | null | undefined) {
  if (!token) return null
  return createHmac("sha256", token).update("toloto-telegram-webhook-v1").digest("hex")
}

/** Only a private chat with one of the configured admins, where the sender is that same admin. */
export function isPrivateAdmin(chat: { id: number; type?: string } | undefined, fromId: number | undefined, adminIds: readonly string[]) {
  if (chat?.type !== "private") return false
  const chatId = String(chat.id)
  return /^\d+$/.test(chatId) && chatId === String(fromId) && adminIds.includes(chatId)
}
