/**
 * Sends operational notifications (sign-ups, sign-ins, card links, funding
 * requests) to a Telegram chat for manual monitoring during testing.
 * Never throws: a missing token or a failed request must not break the
 * calling flow.
 */
export async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    })
  } catch (error) {
    console.error("[v0] Telegram notify failed:", error)
  }
}
