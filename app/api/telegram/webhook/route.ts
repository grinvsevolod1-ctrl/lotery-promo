import { revalidatePath } from "next/cache"
import { extraMessageToken, isPrivateAdmin, parseCallback, parseExtraMessageToken, safeEqual, webhookSecret } from "@/lib/telegram-security"
import { telegramRequest } from "@/lib/telegram"
import { getReviewResult, processReview, setExtraCheckMessage } from "@/lib/reviews"
import { reviewFeedback } from "@/lib/review-feedback"

export const runtime = "nodejs"
export const maxDuration = 30

type Chat = { id: number; type?: string }
type IncomingMessage = { message_id?: number; text?: string; chat?: Chat; from?: { id?: number }; reply_to_message?: { text?: string } }
type Callback = { id?: string; data?: string; from?: { id?: number }; message?: IncomingMessage }
type Update = { callback_query?: Callback; message?: IncomingMessage }

async function handleExtraCheckReply(message: IncomingMessage) {
  if (!isPrivateAdmin(message.chat, message.from?.id)) return
  const prompt = message.reply_to_message?.text
  const answer = message.text
  if (typeof prompt !== "string" || typeof answer !== "string" || !answer.trim()) return
  const target = parseExtraMessageToken(prompt)
  if (!target) return
  const text = answer.trim().slice(0, 500)
  try {
    const changed = await setExtraCheckMessage(target.id, text)
    if (changed) revalidatePath("/cabinet", "layout")
    await telegramRequest("sendMessage", {
      chat_id: message.chat!.id,
      text: changed ? "Текст отправлен пользователю." : "Не удалось отправить: заявка уже не на доп. проверке.",
    })
  } catch {
    console.error("Telegram extra-check reply failed")
  }
}

export async function POST(request: Request) {
  const secret = webhookSecret()
  if (!secret || !safeEqual(request.headers.get("x-telegram-bot-api-secret-token") ?? "", secret)) return new Response("Unauthorized", { status: 401 })
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) return new Response("Too large", { status: 413 })
  let update: Update
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 16_384) return new Response("Too large", { status: 413 })
    update = JSON.parse(raw) as Update
  } catch {
    return new Response("Invalid update", { status: 400 })
  }
  if (!update.callback_query) {
    if (update.message) await handleExtraCheckReply(update.message)
    return Response.json({ ok: true })
  }
  const callback = update.callback_query
  if (!isPrivateAdmin(callback.message?.chat, callback.from?.id)) return Response.json({ ok: true })
  let target
  try {
    target = parseCallback(typeof callback.data === "string" ? callback.data : "")
  } catch {
    return new Response("Review not configured", { status: 503 })
  }
  if (!target) return Response.json({ ok: true })
  let changed: boolean
  try {
    changed = await processReview(target, target.decision)
  } catch {
    console.error("Telegram review failed")
    return new Response("Retry later", { status: 503 })
  }
  revalidatePath("/admin")
  revalidatePath("/cabinet", "layout")
  try {
    if (typeof callback.id === "string") await telegramRequest("answerCallbackQuery", { callback_query_id: callback.id, text: changed ? "Решение сохранено." : "Решение уже применено или недоступно на этом этапе." })
    if (changed && Number.isInteger(callback.message?.message_id)) {
      const result = await getReviewResult(target)
      if (result) await telegramRequest("editMessageText", {
        chat_id: callback.message!.chat!.id,
        message_id: callback.message!.message_id,
        text: `${typeof callback.message?.text === "string" ? callback.message.text.slice(0, 2000) : `Приглашение #${target.id}`}\n\n${reviewFeedback(target, result)}`,
        reply_markup: { inline_keyboard: [] },
        link_preview_options: { is_disabled: true },
      })
    }
    if (changed && target.kind === "card" && target.decision === "extra" && callback.message?.chat) {
      await telegramRequest("sendMessage", {
        chat_id: callback.message.chat.id,
        text: `Ответьте на это сообщение текстом вопроса для пользователя по карте #${target.id}. Он увидит его в личном кабинете.\n\n${extraMessageToken(target.id)}`,
        reply_markup: { force_reply: true, selective: true },
      })
    }
  } catch {
    console.error("Telegram review acknowledgement failed")
  }
  return Response.json({ ok: true })
}
