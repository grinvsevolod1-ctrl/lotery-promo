import { after } from "next/server"

async function sendTelegram(token: string, chatId: string, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error("Telegram notify rejected:", res.status, await res.text())
    }
  } catch (error) {
    console.error("Telegram notify failed:", error)
  }
}

/**
 * Sends operational notifications (sign-ups, sign-ins, card links, funding
 * requests) to a Telegram chat for manual monitoring during testing.
 * Never throws: a missing token or a failed request must not break the
 * calling flow.
 *
 * Delivery is scheduled with `after()` because a bare un-awaited fetch is
 * dropped when Vercel freezes the serverless function after the response.
 */
export function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
  if (!token || !chatId) {
    console.error("Telegram notify skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set")
    return Promise.resolve()
  }

  try {
    after(() => sendTelegram(token, chatId, text))
    return Promise.resolve()
  } catch {
    return sendTelegram(token, chatId, text)
  }
}
