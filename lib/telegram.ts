import { after } from "next/server"
import { isForeignDeployment } from "@/lib/deployment-guard"
import { getTelegramConfig } from "@/lib/telegram-config"
import { callbackData, type ReviewDecision, type ReviewTarget } from "@/lib/telegram-security"

export function escapeTelegram(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

type TelegramMethod = "sendMessage" | "setWebhook" | "deleteWebhook" | "getMe" | "getWebhookInfo" | "answerCallbackQuery" | "editMessageReplyMarkup" | "editMessageText"

export async function telegramRequest(method: TelegramMethod, body: Record<string, unknown>, tokenOverride?: string) {
  const token = tokenOverride?.trim() || (await getTelegramConfig()).token
  if (!token || isForeignDeployment()) throw new Error("Telegram not configured")
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  const result = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: unknown }
  if (!res.ok || !result.ok) throw new Error(result.description || `Telegram request rejected: ${res.status}`)
  return result.result
}

type ReplyMarkup = { inline_keyboard: { text: string; callback_data: string }[][] } | undefined

/** Sends one message to every configured admin; a failure for one admin never blocks the others. */
async function sendToAdmins(text: string, buildMarkup: () => ReplyMarkup) {
  if (isForeignDeployment()) return
  const { token, adminIds } = await getTelegramConfig()
  if (!token || adminIds.length === 0) return
  let reply_markup: ReplyMarkup
  try {
    reply_markup = process.env.ADMIN_SECRET ? buildMarkup() : undefined
  } catch {
    reply_markup = undefined
  }
  const results = await Promise.allSettled(
    adminIds.map((chatId) => telegramRequest("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup }, token)),
  )
  if (results.some((r) => r.status === "rejected")) console.error("Telegram operational notification failed")
}

function reviewMarkup(target?: ReviewTarget): ReplyMarkup {
  if (!target) return undefined
  if (target.kind === "referral") {
    return { inline_keyboard: [[
      { text: "Подтвердить приглашение", callback_data: callbackData(target, "approve") },
      { text: "Отклонить", callback_data: callbackData(target, "reject") },
    ]] }
  }
  if (target.kind === "funding") {
    return { inline_keyboard: [[
      { text: "Подтвердить", callback_data: callbackData(target, "approve") },
      { text: "Отклонить", callback_data: callbackData(target, "reject") },
    ]] }
  }
  return undefined
}

// The bot webhook is never registered automatically on deploy: any other deployment holding the same
// token would re-point the bot to itself. It is registered explicitly from the admin panel.
async function sendTelegram(text: string, target?: ReviewTarget) {
  try {
    await sendToAdmins(text, () => reviewMarkup(target))
  } catch {
    console.error("Telegram operational notification failed")
  }
}

export type TelegramButton = { text: string; decision: ReviewDecision }

/** Sends a message with signed decision buttons, one button per row so long labels stay readable. */
export async function sendTelegramButtons(text: string, target: ReviewTarget, buttons: TelegramButton[]) {
  try {
    await sendToAdmins(text, () => ({
      inline_keyboard: buttons.map((b) => [{ text: b.text, callback_data: callbackData(target, b.decision) }]),
    }))
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
