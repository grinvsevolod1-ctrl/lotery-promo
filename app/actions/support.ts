"use server"

import { asc, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/session"
import { supportReply, supportRequest } from "@/lib/db/schema"
import { publish, topics } from "@/lib/realtime"
import { escapeTelegram, notifyTelegram } from "@/lib/telegram"
import { sendSupportReceivedEmail } from "@/lib/email"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { SUPPORT_TOPICS, type SupportTopic } from "@/lib/support-topics"
import { logActivity } from "@/lib/visitors"

export type SupportRequestView = {
  id: number
  topic: SupportTopic
  message: string
  status: string
  createdAt: Date
  replies: { id: number; body: string; createdAt: Date }[]
}

export type SupportResult = { ok: true; id: number } | { ok: false; error: string }

const sessionUser = getSessionUser

export async function getSupportRequests(): Promise<SupportRequestView[]> {
  const user = await sessionUser()
  const rows = await db
    .select()
    .from(supportRequest)
    .where(eq(supportRequest.userId, user.id))
    .orderBy(desc(supportRequest.createdAt))
    .limit(20)
  const replies = rows.length
    ? await db
        .select({ id: supportReply.id, requestId: supportReply.requestId, body: supportReply.body, createdAt: supportReply.createdAt })
        .from(supportReply)
        .where(inArray(supportReply.requestId, rows.map((r) => r.id)))
        .orderBy(asc(supportReply.createdAt))
    : []
  return rows.map((r) => ({
    ...r,
    topic: r.topic as SupportTopic,
    replies: replies.filter((reply) => reply.requestId === r.id),
  }))
}

export async function submitSupportRequest(input: { topic: string; message: string }): Promise<SupportResult> {
  const user = await sessionUser()
  const topic = input.topic as SupportTopic
  const message = String(input.message ?? "").trim()

  if (!(topic in SUPPORT_TOPICS)) return { ok: false, error: "Выберите тему обращения." }
  if (message.length < 10) return { ok: false, error: "Опишите вопрос подробнее — хотя бы пару предложений." }
  if (message.length > 2000) return { ok: false, error: "Сообщение слишком длинное — до 2000 символов." }
  if (!(await allowUserAction(user.id, "support"))) return { ok: false, error: RATE_LIMIT_ERROR }

  const [row] = await db
    .insert(supportRequest)
    .values({ userId: user.id, topic, message })
    .returning({ id: supportRequest.id })

  await notifyTelegram(
    [
      `<b>Обращение в поддержку №${row.id}</b>`,
      `Тема: ${escapeTelegram(SUPPORT_TOPICS[topic])}`,
      `Игрок: ${escapeTelegram(user.name)} (${escapeTelegram(user.email)})`,
      "",
      escapeTelegram(message),
    ].join("\n"),
  )

  try {
    await sendSupportReceivedEmail({ to: user.email, name: user.name, id: row.id, topic: SUPPORT_TOPICS[topic], message })
  } catch {
    // The request is stored and the admin is notified; a mail outage must not fail it.
    console.error(`[support] confirmation e-mail for request #${row.id} failed`)
  }

  await logActivity("support", `Обращение в поддержку №${row.id}: ${SUPPORT_TOPICS[topic]}`)
  await publish(topics.adminCounts)
  revalidatePath("/cabinet/support")
  revalidatePath("/admin/support")
  return { ok: true, id: row.id }
}
