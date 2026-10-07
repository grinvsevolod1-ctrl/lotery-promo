"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { isAdmin } from "@/lib/admin-auth"
import { isForeignDeployment } from "@/lib/deployment-guard"
import { SETTING_KEYS, setSetting } from "@/lib/settings"
import { site } from "@/lib/site"
import { telegramRequest } from "@/lib/telegram"
import {
  MAX_TELEGRAM_ADMINS,
  getTelegramConfig,
  invalidateTelegramConfig,
  isValidAdminId,
  isValidBotToken,
  maskToken,
} from "@/lib/telegram-config"
import { webhookSecret } from "@/lib/telegram-security"

export type TelegramSettings = {
  tokenMasked: string
  tokenSource: "admin" | "env" | null
  adminIds: string[]
  adminIdsSource: "admin" | "env" | null
  botUsername: string | null
  webhookUrl: string
  webhookActive: boolean
  webhookError: string | null
}

export type TelegramActionResult = { ok: true; message: string } | { ok: false; error: string }
export type TelegramTestResult = { id: string; ok: boolean; error?: string }

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login")
}

const webhookUrl = () => `${site.url}/api/telegram/webhook`

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Неизвестная ошибка"
}

async function registerWebhook(token: string): Promise<TelegramActionResult> {
  if (isForeignDeployment()) return { ok: false, error: "Этот деплой не может управлять ботом" }
  const url = webhookUrl()
  if (!url.startsWith("https://")) return { ok: false, error: `Telegram принимает только https-адрес, сейчас: ${url}` }
  try {
    await telegramRequest(
      "setWebhook",
      { url, secret_token: webhookSecret(token), allowed_updates: ["message", "callback_query"], drop_pending_updates: false },
      token,
    )
    return { ok: true, message: "Вебхук подключён — кнопки в Telegram работают" }
  } catch (error) {
    return { ok: false, error: `Не удалось подключить вебхук: ${errorText(error)}` }
  }
}

export async function getTelegramSettings(): Promise<TelegramSettings> {
  await requireAdmin()
  const config = await getTelegramConfig()
  let botUsername: string | null = null
  let webhookActive = false
  let webhookError: string | null = null
  if (config.token && !isForeignDeployment()) {
    const [me, info] = await Promise.allSettled([
      telegramRequest("getMe", {}, config.token) as Promise<{ username?: string }>,
      telegramRequest("getWebhookInfo", {}, config.token) as Promise<{ url?: string; last_error_message?: string }>,
    ])
    if (me.status === "fulfilled") botUsername = me.value?.username ?? null
    else webhookError = `Токен не принят Telegram: ${errorText(me.reason)}`
    if (info.status === "fulfilled") {
      webhookActive = info.value?.url === webhookUrl()
      if (!webhookError && info.value?.last_error_message) webhookError = info.value.last_error_message
    }
  }
  return {
    tokenMasked: maskToken(config.token),
    tokenSource: config.tokenSource,
    adminIds: config.adminIds,
    adminIdsSource: config.adminIdsSource,
    botUsername,
    webhookUrl: webhookUrl(),
    webhookActive,
    webhookError,
  }
}

export async function saveTelegramSettings(input: { token: string; adminIds: string[] }): Promise<TelegramActionResult> {
  await requireAdmin()
  const token = typeof input?.token === "string" ? input.token.trim() : ""
  const rawIds = Array.isArray(input?.adminIds) ? input.adminIds.slice(0, MAX_TELEGRAM_ADMINS) : []
  const ids = rawIds.map((id) => (typeof id === "string" ? id.trim() : "")).filter(Boolean)

  const invalid = ids.find((id) => !isValidAdminId(id))
  if (invalid) return { ok: false, error: `«${invalid.slice(0, 20)}» — не user ID. Нужны только цифры, например 123456789` }
  const uniqueIds = [...new Set(ids)]

  if (token) {
    if (!isValidBotToken(token)) return { ok: false, error: "Токен должен выглядеть так: 123456789:AAH…" }
    try {
      await telegramRequest("getMe", {}, token)
    } catch (error) {
      return { ok: false, error: `Telegram не принял токен: ${errorText(error)}` }
    }
  }

  const current = await getTelegramConfig()
  if (token) await setSetting(SETTING_KEYS.telegramBotToken, token)
  await setSetting(SETTING_KEYS.telegramAdminIds, JSON.stringify(uniqueIds))
  invalidateTelegramConfig()
  revalidatePath("/admin/telegram")

  if (token && token !== current.token) {
    const webhook = await registerWebhook(token)
    if (!webhook.ok) return { ok: false, error: `Настройки сохранены. ${webhook.error}` }
    return { ok: true, message: "Токен и администраторы сохранены, вебхук подключён" }
  }
  return { ok: true, message: uniqueIds.length ? "Администраторы сохранены" : "Список очищен — уведомления не отправляются" }
}

export async function connectTelegramWebhook(): Promise<TelegramActionResult> {
  await requireAdmin()
  const { token } = await getTelegramConfig()
  if (!token) return { ok: false, error: "Сначала сохраните токен бота" }
  const result = await registerWebhook(token)
  revalidatePath("/admin/telegram")
  return result
}

export async function sendTelegramTest(): Promise<TelegramTestResult[] | { error: string }> {
  await requireAdmin()
  const { token, adminIds } = await getTelegramConfig()
  if (!token) return { error: "Не задан токен бота" }
  if (adminIds.length === 0) return { error: "Не указан ни один администратор" }
  const text = `<b>Проверка уведомлений</b>\nЭтот чат получает заявки ${site.name}.`
  return Promise.all(
    adminIds.map(async (id) => {
      try {
        await telegramRequest("sendMessage", { chat_id: id, text, parse_mode: "HTML" }, token)
        return { id, ok: true }
      } catch (error) {
        const message = errorText(error)
        return { id, ok: false, error: /chat not found|bot was blocked/i.test(message) ? "Админ не нажал /start в боте или заблокировал его" : message }
      }
    }),
  )
}
