import { revalidatePath } from "next/cache"
import { isPrivateAdmin, parseCallback, safeEqual, webhookSecret } from "@/lib/telegram-security"
import { telegramRequest } from "@/lib/telegram"
import { processReview } from "@/lib/reviews"

export const runtime = "nodejs"
export const maxDuration = 30

type Callback = { id?: string; data?: string; from?: { id?: number }; message?: { message_id?: number; chat?: { id: number; type?: string } } }

export async function POST(request: Request) {
  const secret = webhookSecret()
  if (!secret || !safeEqual(request.headers.get("x-telegram-bot-api-secret-token") ?? "", secret)) return new Response("Unauthorized", { status: 401 })
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) return new Response("Too large", { status: 413 })
  let callback: Callback | undefined
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 16_384) return new Response("Too large", { status: 413 })
    callback = (JSON.parse(raw) as { callback_query?: Callback }).callback_query
  } catch {
    return new Response("Invalid update", { status: 400 })
  }
  if (!callback || !isPrivateAdmin(callback.message?.chat, callback.from?.id)) return Response.json({ ok: true })
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
    if (typeof callback.id === "string") await telegramRequest("answerCallbackQuery", { callback_query_id: callback.id, text: changed ? ({ approve: "Тест подтверждён / тестовая ссылка выдана.", reject: "Отклонено.", code: "Запрошен фиксированный тестовый код, не банковский.", extra: "Запрошена дополнительная симуляция.", checkout: "Тестовая ссылка выдана." })[target.decision] : "Решение уже применено или недоступно на этом этапе." })
    if (changed && Number.isInteger(callback.message?.message_id)) await telegramRequest("editMessageReplyMarkup", { chat_id: callback.message!.chat!.id, message_id: callback.message!.message_id, reply_markup: { inline_keyboard: [] } })
  } catch {
    console.error("Telegram review acknowledgement failed")
  }
  return Response.json({ ok: true })
}
