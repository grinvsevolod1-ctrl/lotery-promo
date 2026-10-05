"use server"

import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { supportRequest } from "@/lib/db/schema"
import { escapeTelegram, notifyTelegram } from "@/lib/telegram"
import { sendSupportReceivedEmail } from "@/lib/email"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { SUPPORT_TOPICS, type SupportTopic } from "@/lib/support-topics"

export type SupportRequestView = {
  id: number
  topic: SupportTopic
  message: string
  status: string
  createdAt: Date
}

export type SupportResult = { ok: true; id: number } | { ok: false; error: string }

async function sessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

export async function getSupportRequests(): Promise<SupportRequestView[]> {
  const user = await sessionUser()
  const rows = await db
    .select()
    .from(supportRequest)
    .where(eq(supportRequest.userId, user.id))
    .orderBy(desc(supportRequest.createdAt))
    .limit(20)
  return rows.map((r) => ({ ...r, topic: r.topic as SupportTopic }))
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

  revalidatePath("/cabinet/support")
  return { ok: true, id: row.id }
}
