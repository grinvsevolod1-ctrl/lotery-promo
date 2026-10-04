// Наш платёжный шлюз: короткоживущий подписанный и зашифрованный токен для
// шага подтверждения привязки карты. Полный номер карты никогда не попадает
// в базу и не виден клиенту — только внутри зашифрованного токена, который
// передаётся между формой привязки и страницей подтверждения.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const TTL_MS = 5 * 60 * 1000

export type CardVerificationPayload = {
  userId: string
  number: string
  cardholder: string
  expMonth: number
  expYear: number
  exp: number
}

function gatewayKey() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set")
  return createHash("sha256").update(secret).digest()
}

function toBase64Url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(s: string) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

/** Создаёт токен подтверждения (действителен 5 минут). */
export function createCardVerificationToken(data: Omit<CardVerificationPayload, "exp">): string {
  const payload: CardVerificationPayload = { ...data, exp: Date.now() + TTL_MS }
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", gatewayKey(), iv)
  const json = Buffer.from(JSON.stringify(payload), "utf8")
  const ciphertext = Buffer.concat([cipher.update(json), cipher.final()])
  const tag = cipher.getAuthTag()
  return toBase64Url(Buffer.concat([iv, tag, ciphertext]))
}

/** Расшифровывает токен подтверждения. Возвращает null, если он повреждён или истёк. */
export function readCardVerificationToken(token: string): CardVerificationPayload | null {
  try {
    const buf = fromBase64Url(token)
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const ciphertext = buf.subarray(28)
    const decipher = createDecipheriv("aes-256-gcm", gatewayKey(), iv)
    decipher.setAuthTag(tag)
    const json = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
    const payload = JSON.parse(json) as CardVerificationPayload
    if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
