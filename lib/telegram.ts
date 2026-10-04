import { after } from "next/server"
import { site } from "@/lib/site"
import { callbackData, webhookSecret, type ReviewTarget } from "@/lib/telegram-security"

export function escapeTelegram(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export async function telegramRequest(method: "sendMessage" | "setWebhook" | "answerCallbackQuery" | "editMessageReplyMarkup" | "editMessageText", body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) throw new Error("Telegram not configured")
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Telegram request rejected: ${res.status}`)
  const result = await res.json() as { ok?: boolean }
  if (!result.ok) throw new Error("Telegram request rejected")
}

export async function configureWebhook() {
  if (process.env.NODE_ENV !== "production" || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")) return
  const origin = site.url
  const secret = webhookSecret()
  if (!origin || !secret) return
  const url = new URL("/api/telegram/webhook", origin)
  if (url.protocol !== "https:") return
  await telegramRequest("setWebhook", { url: url.toString(), secret_token: secret, allowed_updates: ["callback_query"] })
}

async function sendTelegram(text: string, target?: ReviewTarget) {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return
  try {
    try {
      await configureWebhook()
    } catch {
      console.error("Telegram webhook registration failed; notification will still be sent")
    }
    const controls = target?.kind === "referral" && process.env.ADMIN_SECRET && /^\d+$/.test(chatId)
      ? { inline_keyboard: [[
          { text: "Подтвердить приглашение", callback_data: callbackData(target, "approve") },
          { text: "Отклонить", callback_data: callbackData(target, "reject") },
        ]] }
      : undefined
    await telegramRequest("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: controls })
  } catch {
    console.error("Telegram operational notification failed")
  }
}

/** after() keeps notification delivery alive after a serverless response. */
export function notifyTelegram(text: string, target?: ReviewTarget): Promise<void> {
  try {
    after(() => sendTelegram(text, target))
    return Promise.resolve()
  } catch {
    return sendTelegram(text, target)
  }
}
