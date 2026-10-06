"use server"

import { asc, count, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { supportReply, supportRequest, supportTemplate, user } from "@/lib/db/schema"
import { isAdmin } from "@/lib/admin-auth"
import { sendSupportReplyEmail } from "@/lib/email"
import { notifySafe } from "@/lib/notifications"
import { publish, topics } from "@/lib/realtime"
import { DEFAULT_SUPPORT_TEMPLATES } from "@/lib/support-templates"
import { SUPPORT_TOPICS, type SupportTopic } from "@/lib/support-topics"

export type TicketFilter = "open" | "closed" | "all"

export type AdminTicketReply = { id: number; body: string; emailed: boolean; createdAt: string }

export type AdminTicket = {
  id: number
  topicLabel: string
  message: string
  status: string
  createdAt: string
  userName: string
  userEmail: string
  replies: AdminTicketReply[]
}

export type SupportTemplateRow = { id: number; title: string; body: string }

export type AdminSupportResult = { ok: true; emailed?: boolean } | { ok: false; error: string }

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Forbidden")
}

function refresh() {
  revalidatePath("/admin/support")
  revalidatePath("/cabinet/support")
}

export async function listTickets(filter: TicketFilter): Promise<AdminTicket[]> {
  await assertAdmin()
  const rows = await db
    .select({
      id: supportRequest.id,
      topic: supportRequest.topic,
      message: supportRequest.message,
      status: supportRequest.status,
      createdAt: supportRequest.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(supportRequest)
    .leftJoin(user, eq(user.id, supportRequest.userId))
    .where(filter === "all" ? undefined : eq(supportRequest.status, filter))
    .orderBy(desc(supportRequest.createdAt))
    .limit(100)

  const replies = rows.length
    ? await db
        .select()
        .from(supportReply)
        .where(inArray(supportReply.requestId, rows.map((row) => row.id)))
        .orderBy(asc(supportReply.createdAt))
    : []

  return rows.map((row) => ({
    id: row.id,
    topicLabel: SUPPORT_TOPICS[row.topic as SupportTopic] ?? row.topic,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    userName: row.userName ?? "Игрок",
    userEmail: row.userEmail ?? "",
    replies: replies
      .filter((reply) => reply.requestId === row.id)
      .map((reply) => ({ id: reply.id, body: reply.body, emailed: reply.emailed, createdAt: reply.createdAt.toISOString() })),
  }))
}

export async function getTicketCounts(): Promise<Record<TicketFilter, number>> {
  await assertAdmin()
  const rows = await db.select({ status: supportRequest.status, total: count() }).from(supportRequest).groupBy(supportRequest.status)
  const open = Number(rows.find((row) => row.status === "open")?.total ?? 0)
  const closed = Number(rows.find((row) => row.status === "closed")?.total ?? 0)
  return { open, closed, all: open + closed }
}

export async function replyToTicket(input: { id: number; body: string; close: boolean }): Promise<AdminSupportResult> {
  await assertAdmin()
  const body = String(input.body ?? "").trim()
  if (body.length < 2) return { ok: false, error: "Напишите текст ответа." }
  if (body.length > 4000) return { ok: false, error: "Ответ слишком длинный — до 4000 символов." }
  if (!Number.isInteger(input.id)) return { ok: false, error: "Обращение не найдено." }

  const [ticket] = await db
    .select({
      id: supportRequest.id,
      userId: supportRequest.userId,
      topic: supportRequest.topic,
      userName: user.name,
      userEmail: user.email,
    })
    .from(supportRequest)
    .leftJoin(user, eq(user.id, supportRequest.userId))
    .where(eq(supportRequest.id, input.id))
    .limit(1)
  if (!ticket) return { ok: false, error: "Обращение не найдено." }

  const [reply] = await db.insert(supportReply).values({ requestId: ticket.id, body }).returning({ id: supportReply.id })
  if (input.close) await db.update(supportRequest).set({ status: "closed" }).where(eq(supportRequest.id, ticket.id))

  let emailed = false
  if (ticket.userEmail) {
    try {
      await sendSupportReplyEmail({
        to: ticket.userEmail,
        name: ticket.userName ?? "",
        id: ticket.id,
        topic: SUPPORT_TOPICS[ticket.topic as SupportTopic] ?? ticket.topic,
        reply: body,
      })
      emailed = true
      await db.update(supportReply).set({ emailed: true }).where(eq(supportReply.id, reply.id))
    } catch {
      // The answer is saved and visible in the cabinet; only the letter failed.
      console.error(`[support] reply e-mail for request #${ticket.id} failed`)
    }
  }

  await notifySafe(ticket.userId, {
    kind: "system",
    title: `Ответ на обращение №${ticket.id}`,
    body: body.length > 140 ? `${body.slice(0, 137)}…` : body,
    href: "/cabinet/support",
  })
  await publish(topics.adminCounts)
  refresh()
  return { ok: true, emailed }
}

export async function setTicketStatus(id: number, status: "open" | "closed"): Promise<AdminSupportResult> {
  await assertAdmin()
  if (!Number.isInteger(id) || (status !== "open" && status !== "closed")) return { ok: false, error: "Некорректный запрос." }
  await db.update(supportRequest).set({ status }).where(eq(supportRequest.id, id))
  await publish(topics.adminCounts)
  refresh()
  return { ok: true }
}

export async function listTemplates(): Promise<SupportTemplateRow[]> {
  await assertAdmin()
  const [{ total }] = await db.select({ total: count() }).from(supportTemplate)
  if (Number(total) === 0) await db.insert(supportTemplate).values([...DEFAULT_SUPPORT_TEMPLATES])
  return db
    .select({ id: supportTemplate.id, title: supportTemplate.title, body: supportTemplate.body })
    .from(supportTemplate)
    .orderBy(asc(supportTemplate.id))
}

export async function createTemplate(input: { title: string; body: string }): Promise<AdminSupportResult> {
  await assertAdmin()
  const title = String(input.title ?? "").trim()
  const body = String(input.body ?? "").trim()
  if (title.length < 2 || title.length > 60) return { ok: false, error: "Название — от 2 до 60 символов." }
  if (body.length < 5 || body.length > 4000) return { ok: false, error: "Текст шаблона — от 5 до 4000 символов." }
  await db.insert(supportTemplate).values({ title, body })
  revalidatePath("/admin/support")
  return { ok: true }
}

export async function deleteTemplate(id: number): Promise<AdminSupportResult> {
  await assertAdmin()
  if (!Number.isInteger(id)) return { ok: false, error: "Шаблон не найден." }
  await db.delete(supportTemplate).where(eq(supportTemplate.id, id))
  revalidatePath("/admin/support")
  return { ok: true }
}
