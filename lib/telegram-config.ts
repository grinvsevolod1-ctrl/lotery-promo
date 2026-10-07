import { SETTING_KEYS, getSetting } from "@/lib/settings"

export const MAX_TELEGRAM_ADMINS = 3
const TOKEN_PATTERN = /^\d{5,15}:[A-Za-z0-9_-]{30,64}$/
const ADMIN_ID_PATTERN = /^[1-9]\d{4,14}$/
const CACHE_MS = 15_000

export type TelegramConfig = {
  token: string | null
  adminIds: string[]
  tokenSource: "admin" | "env" | null
  adminIdsSource: "admin" | "env" | null
}

export function isValidBotToken(value: string) {
  return TOKEN_PATTERN.test(value)
}

export function isValidAdminId(value: string) {
  return ADMIN_ID_PATTERN.test(value)
}

/** Accepts a JSON array or a comma/space separated list; keeps up to three unique numeric user ids. */
export function parseAdminIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  let items: unknown[]
  try {
    const parsed = JSON.parse(raw)
    items = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    items = raw.split(/[\s,;]+/)
  }
  const ids = items.map((item) => String(item).trim()).filter(isValidAdminId)
  return [...new Set(ids)].slice(0, MAX_TELEGRAM_ADMINS)
}

export function maskToken(token: string | null) {
  if (!token) return ""
  const [botId, secret = ""] = token.split(":")
  return `${botId}:••••••${secret.slice(-4)}`
}

let cached: { value: TelegramConfig; expires: number } | null = null

export function invalidateTelegramConfig() {
  cached = null
}

/** Settings saved in the admin panel win; the old .env values remain a fallback until the admin saves new ones. */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  if (cached && cached.expires > Date.now()) return cached.value
  const [savedToken, savedIds] = await Promise.all([
    getSetting(SETTING_KEYS.telegramBotToken).catch(() => null),
    getSetting(SETTING_KEYS.telegramAdminIds).catch(() => null),
  ])
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || null
  const envIds = parseAdminIds(process.env.TELEGRAM_CHAT_ID)
  const adminIds = parseAdminIds(savedIds)
  const value: TelegramConfig = {
    token: savedToken?.trim() || envToken,
    tokenSource: savedToken?.trim() ? "admin" : envToken ? "env" : null,
    adminIds: savedIds !== null ? adminIds : envIds,
    adminIdsSource: savedIds !== null ? "admin" : envIds.length ? "env" : null,
  }
  cached = { value, expires: Date.now() + CACHE_MS }
  return value
}
