import { after } from "next/server"
import { site } from "@/lib/site"
import { isForeignDeployment } from "@/lib/deployment-guard"
import { callbackData, webhookSecret, type ReviewTarget } from "@/lib/telegram-security"

export function escapeTelegram(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export async function telegramRequest(method: "sendMessage" | "setWebhook" | "answerCallbackQuery" | "editMessageReplyMarkup" | "editMessageText", body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token || isForeignDeployment()) throw new Error("Telegram not configured")
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

// The bot webhook is never registered automatically: any other deployment holding the same token
// would re-point the bot to itself and steal operator replies. It is set once from the server.
async function sendTelegram(text: string, target?: ReviewTarget) {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN || isForeignDeployment()) return
  try {
    const canReview = target && process.env.ADMIN_SECRET && /^\d+$/.test(chatId)
    const controls = !canReview
      ? undefined
      : target.kind === "referral"
        ? { inline_keyboard: [[
            { text: "Подтвердить приглашение", callback_data: callbackData(target, "approve") },
            { text: "Отклонить", callback_data: callbackData(target, "reject") },
          ]] }
        : target.kind === "funding"
          ? { inline_keyboard: [[
              { text: "Подтвердить", callback_data: callbackData(target, "approve") },
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
