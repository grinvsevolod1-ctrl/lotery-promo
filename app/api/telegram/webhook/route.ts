import { revalidatePath } from "next/cache"
import { extraMessageToken, isPrivateAdmin, parseCallback, parseExtraMessageToken, safeEqual, webhookSecret } from "@/lib/telegram-security"
import { telegramRequest } from "@/lib/telegram"
import { getTelegramConfig } from "@/lib/telegram-config"
import { getReviewResult, processReview, setExtraCheckMessage } from "@/lib/reviews"
import { reviewFeedback } from "@/lib/review-feedback"
import { decideVerification, isVerificationDecision, verificationFeedback } from "@/lib/verification-flow"
import { decideJobApplication, isJobDecision, jobFeedback } from "@/lib/jobs-flow"
import { decideCardRequest, findRequestNo, normalizeRedirectUrl, setCardRedirect, type CardDecision } from "@/lib/card-requests"

export const runtime = "nodejs"
export const maxDuration = 30

type Chat = { id: number; type?: string }
type IncomingMessage = { message_id?: number; text?: string; chat?: Chat; from?: { id?: number }; reply_to_message?: { text?: string } }
type Callback = { id?: string; data?: string; from?: { id?: number }; message?: IncomingMessage }
type Update = { callback_query?: Callback; message?: IncomingMessage }

const DECISION_WORDS: Record<string, CardDecision> = { ok: "approve", "+": "approve", no: "reject", "-": "reject" }

/**
 * Operator commands for card requests, either as a reply to the request message or with the number inline:
 *   https://page.example      -> send the player to this page
 *   ok / +  |  no / -         -> confirm or reject the card
 */
async function handleCardRequestCommand(message: IncomingMessage) {
  const text = message.text?.trim()
  if (!text) return false
  const requestNo = findRequestNo(text) ?? findRequestNo(message.reply_to_message?.text ?? "")
  if (!requestNo) return false
  const rest = text.replace(new RegExp(requestNo, "i"), "").replace(/^\/\w+/, "").trim()
  const url = rest.split(/\s+/).find((part) => /^https:\/\//i.test(part))
  let reply: string
  if (url) {
    const normalized = normalizeRedirectUrl(url)
    reply = !normalized
      ? "Нужна ссылка вида https://…"
      : (await setCardRedirect(requestNo, normalized)) ? `№ ${requestNo}: перенаправление отправлено.` : `№ ${requestNo}: заявка не найдена или уже закрыта.`
  } else {
    const decision = DECISION_WORDS[rest.toLowerCase()]
    if (!decision) return false
    const changed = await decideCardRequest(requestNo, decision)
    reply = changed ? `№ ${requestNo}: ${decision === "approve" ? "карта подтверждена" : "карта отклонена"}.` : `№ ${requestNo}: решение уже принято или заявка не найдена.`
  }
  revalidatePath("/cabinet", "layout")
  await telegramRequest("sendMessage", { chat_id: message.chat!.id, text: reply })
  return true
}

async function handleExtraCheckReply(message: IncomingMessage, adminIds: string[]) {
  if (!isPrivateAdmin(message.chat, message.from?.id, adminIds)) return
  try {
    if (await handleCardRequestCommand(message)) return
  } catch {
    console.error("Telegram card command failed")
    return
  }
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

async function handleVerificationButton(callback: Callback, id: number, decision: string) {
  let changed = false
  if (isVerificationDecision(decision)) {
    try {
      changed = await decideVerification(id, decision)
    } catch {
      console.error("Telegram verification decision failed")
    }
  }
  try {
    if (typeof callback.id === "string") {
      await telegramRequest("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: changed ? "Решение сохранено." : "Заявка уже на другом этапе.",
      })
    }
    // Buttons are removed after any press so an old message can never be used again.
    if (Number.isInteger(callback.message?.message_id) && callback.message?.chat) {
      const original = typeof callback.message.text === "string" ? callback.message.text.slice(0, 2000) : `Верификация #${id}`
      await telegramRequest("editMessageText", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        text: `${original}\n\n${changed && isVerificationDecision(decision) ? verificationFeedback(decision) : "Кнопки неактуальны: заявка уже на другом этапе."}`,
        reply_markup: { inline_keyboard: [] },
      })
    }
  } catch {
    console.error("Telegram verification acknowledgement failed")
  }
}

async function handleJobButton(callback: Callback, id: number, decision: string) {
  let changed = false
  if (isJobDecision(decision)) {
    try {
      changed = await decideJobApplication(id, decision)
    } catch {
      console.error("Telegram job decision failed")
    }
  }
  try {
    if (typeof callback.id === "string") {
      await telegramRequest("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: changed ? "Решение сохранено." : "Анкета уже на другом этапе.",
      })
    }
    if (Number.isInteger(callback.message?.message_id) && callback.message?.chat) {
      const original = typeof callback.message.text === "string" ? callback.message.text.slice(0, 2000) : `Анкета #${id}`
      await telegramRequest("editMessageText", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        text: `${original}\n\n${changed && isJobDecision(decision) ? jobFeedback(decision) : "Кнопки неактуальны: анкета уже на другом этапе."}`,
        reply_markup: { inline_keyboard: [] },
        link_preview_options: { is_disabled: true },
      })
    }
  } catch {
    console.error("Telegram job acknowledgement failed")
  }
}

export async function POST(request: Request) {
  const { token, adminIds } = await getTelegramConfig()
  const secret = webhookSecret(token)
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
    if (update.message) await handleExtraCheckReply(update.message, adminIds)
    return Response.json({ ok: true })
  }
  const callback = update.callback_query
  if (!isPrivateAdmin(callback.message?.chat, callback.from?.id, adminIds)) return Response.json({ ok: true })
  let target
  try {
    target = parseCallback(typeof callback.data === "string" ? callback.data : "")
  } catch {
    return new Response("Review not configured", { status: 503 })
  }
  if (!target) {
    if (typeof callback.id === "string") {
      await telegramRequest("answerCallbackQuery", { callback_query_id: callback.id, text: "Кнопка устарела." }).catch(() => {})
    }
    return Response.json({ ok: true })
  }
  if (target.kind === "verification") {
    await handleVerificationButton(callback, target.id, target.decision)
    return Response.json({ ok: true })
  }
  if (target.kind === "job") {
    await handleJobButton(callback, target.id, target.decision)
    return Response.json({ ok: true })
  }
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
        text: `${typeof callback.message?.text === "string" ? callback.message.text.slice(0, 2000) : `Заявка #${target.id}`}\n\n${reviewFeedback(target, result)}`,
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
