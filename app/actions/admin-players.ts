"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, desc, eq, ilike, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { notification, session, transaction, user, userVerification } from "@/lib/db/schema"
import { balanceOf, lockUser } from "@/lib/db/ledger"
import { isAdmin } from "@/lib/admin-auth"
import { notify, notifySafe, formatByn, type NotificationKind } from "@/lib/notifications"
import { sendAdminMessageEmail } from "@/lib/email"
import { publish, topics } from "@/lib/realtime"
import { requestAdditionalVerification } from "@/lib/verification-flow"

export type ActionResult = { ok: true; message: string } | { ok: false; error: string }

export interface PlayerRow {
  id: string
  name: string
  email: string
  emailVerified: boolean
  createdAt: string
  blockedAt: string | null
  blockReason: string | null
  balance: number
  verification: string | null
}

import { PLAYER_FILTERS, type PlayerFilter } from "@/lib/player-filters"

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized")
}

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max)

function audienceCondition(filter: PlayerFilter): SQL | undefined {
  if (filter === "active") return isNull(user.blockedAt)
  if (filter === "blocked") return isNotNull(user.blockedAt)
  if (filter === "unverified")
    return and(isNull(user.blockedAt), or(isNull(userVerification.status), ne(userVerification.status, "approved")))
  return undefined
}

export async function listPlayers(query = "", filter: PlayerFilter = "all"): Promise<PlayerRow[]> {
  await assertAdmin()
  const term = query.trim().slice(0, 80)
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      blockedAt: user.blockedAt,
      blockReason: user.blockReason,
      verification: userVerification.status,
      balance: sql<number>`coalesce((select sum(${transaction.amount}) from ${transaction} where ${transaction.userId} = ${user.id}), 0)`,
    })
    .from(user)
    .leftJoin(userVerification, eq(userVerification.userId, user.id))
    .where(and(audienceCondition(filter), term ? or(ilike(user.email, `%${term}%`), ilike(user.name, `%${term}%`)) : undefined))
    .orderBy(desc(user.createdAt))
    .limit(300)

  return rows.map((row) => ({
    ...row,
    balance: Number(row.balance),
    createdAt: row.createdAt.toISOString(),
    blockedAt: row.blockedAt?.toISOString() ?? null,
  }))
}

export async function getPlayerStats() {
  await assertAdmin()
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      blocked: sql<number>`count(*) filter (where ${user.blockedAt} is not null)`,
      last24h: sql<number>`count(*) filter (where ${user.createdAt} > now() - interval '24 hours')`,
      verified: sql<number>`count(*) filter (where ${userVerification.status} = 'approved')`,
    })
    .from(user)
    .leftJoin(userVerification, eq(userVerification.userId, user.id))
  return {
    total: Number(row.total),
    blocked: Number(row.blocked),
    last24h: Number(row.last24h),
    verified: Number(row.verified),
  }
}

async function findPlayer(userId: string) {
  const [row] = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, userId)).limit(1)
  return row ?? null
}

function refresh() {
  revalidatePath("/admin/users")
  void publish(topics.adminUsers)
}

export async function adjustPlayerBalance(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  const userId = text(formData, "userId", 100)
  const operation = text(formData, "operation", 10)
  const kind = text(formData, "kind", 10) === "bonus" ? "bonus" : "real"
  const comment = text(formData, "comment", 300)
  const sendEmail = formData.get("sendEmail") === "on"
  const amount = Math.round(Number(String(formData.get("amount") ?? "").replace(",", ".")) * 100) / 100

  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) return { ok: false, error: "Укажите сумму от 0,01 до 100 000 BYN" }
  const player = await findPlayer(userId)
  if (!player) return { ok: false, error: "Пользователь не найден" }

  const isCredit = operation !== "debit"
  const type = isCredit ? (kind === "bonus" ? "bonus" : "admin_credit") : "admin_debit"
  const description = comment || (isCredit ? (kind === "bonus" ? "Бонус от администрации" : "Начисление от администрации") : "Списание администрацией")

  try {
    await db.transaction(async (tx) => {
      await lockUser(tx, userId)
      if (!isCredit && (await balanceOf(tx, userId)) < amount) throw new Error("INSUFFICIENT")
      await tx.insert(transaction).values({ userId, type, amount: isCredit ? amount : -amount, description })
      await notify(tx, userId, {
        kind: (kind === "bonus" && isCredit ? "bonus" : "money") as NotificationKind,
        title: isCredit ? `Зачислено ${formatByn(amount)}` : `Списано ${formatByn(amount)}`,
        body: description + (kind === "bonus" && isCredit ? ". Бонус нужно отыграть перед выводом." : ""),
        href: "/cabinet/deposit",
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT") return { ok: false, error: "На балансе недостаточно средств" }
    throw error
  }

  await publish(topics.userBalance(userId))
  if (sendEmail) {
    after(() =>
      sendAdminMessageEmail({
        to: player.email,
        name: player.name,
        title: isCredit ? `На ваш счёт зачислено ${formatByn(amount)}` : `С вашего счёта списано ${formatByn(amount)}`,
        body: description + (kind === "bonus" && isCredit ? "\n\nЭто бонусные средства — перед выводом их нужно отыграть." : ""),
        cta: { label: "Открыть кошелёк", url: "/cabinet/deposit" },
      }).catch((error) => console.error("admin balance mail failed", error)),
    )
  }
  refresh()
  return { ok: true, message: isCredit ? `Зачислено ${formatByn(amount)}` : `Списано ${formatByn(amount)}` }
}

export async function setPlayerBlock(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  const userId = text(formData, "userId", 100)
  const block = formData.get("block") === "1"
  const reason = text(formData, "reason", 300)
  const player = await findPlayer(userId)
  if (!player) return { ok: false, error: "Пользователь не найден" }
  if (block && !reason) return { ok: false, error: "Укажите причину блокировки" }

  await db
    .update(user)
    .set(block ? { blockedAt: new Date(), blockReason: reason, updatedAt: new Date() } : { blockedAt: null, blockReason: null, updatedAt: new Date() })
    .where(eq(user.id, userId))
  if (block) await db.delete(session).where(eq(session.userId, userId))

  if (formData.get("sendEmail") === "on") {
    after(() =>
      sendAdminMessageEmail({
        to: player.email,
        name: player.name,
        title: block ? "Ваш аккаунт заблокирован" : "Ваш аккаунт разблокирован",
        body: block
          ? `Доступ к аккаунту ограничен.\n\nПричина: ${reason}\n\nЕсли вы не согласны с решением, ответьте на это письмо.`
          : "Доступ к аккаунту восстановл��н. Вы снова можете войти в личный кабинет.",
        cta: block ? undefined : { label: "Войти", url: "/sign-in" },
      }).catch((error) => console.error("admin block mail failed", error)),
    )
  }
  if (!block) await notifySafe(userId, { kind: "system", title: "Аккаунт разблокирован", body: "Доступ к аккаунту восстановлен." })
  refresh()
  return { ok: true, message: block ? "Пользователь заблокирован" : "Пользователь разблокирован" }
}

export async function requestPlayerVerification(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  const userId = text(formData, "userId", 100)
  const note = text(formData, "note", 500)
  const player = await findPlayer(userId)
  if (!player) return { ok: false, error: "Пользователь не найден" }

  const body =
    "Пожалуйста, пройдите верификацию личности в личном кабинете — без неё вывод выигрышей недоступен." + (note ? `\n\n${note}` : "")
  await notifySafe(userId, { kind: "system", title: "Требуется верификация", body, href: "/cabinet/verification" })
  after(() =>
    sendAdminMessageEmail({
      to: player.email,
      name: player.name,
      title: "Пройдите верификацию",
      body,
      cta: { label: "Пройти верификацию", url: "/cabinet/verification" },
    }).catch((error) => console.error("verification request mail failed", error)),
  )
  return { ok: true, message: "Запрос отправлен" }
}

export async function requestPlayerAdditionalVerification(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  const userId = text(formData, "userId", 100)
  const note = text(formData, "note", 500)
  if (!(await findPlayer(userId))) return { ok: false, error: "Пользователь не найден" }

  const [row] = await db
    .select({ id: userVerification.id, status: userVerification.status })
    .from(userVerification)
    .where(eq(userVerification.userId, userId))
    .limit(1)
  if (!row || row.status !== "approved") return { ok: false, error: "Дополнительную верификацию можно запросить только у верифицированного пользователя" }

  if (!(await requestAdditionalVerification(row.id, note || null))) {
    return { ok: false, error: "Статус пользователя изменился, обновите страницу" }
  }
  refresh()
  return { ok: true, message: "Дополнительная верификация запрошена, пользователь уведомлён" }
}

const BROADCAST_KINDS = ["bonus", "system", "money", "win"] as const

export async function sendBroadcast(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  const title = text(formData, "title", 120)
  const body = text(formData, "body", 3000)
  const ctaLabel = text(formData, "ctaLabel", 40)
  const ctaUrl = text(formData, "ctaUrl", 300)
  const kindInput = text(formData, "kind", 10)
  const kind = ((BROADCAST_KINDS as readonly string[]).includes(kindInput) ? kindInput : "system") as NotificationKind
  const audienceInput = text(formData, "audience", 20)
  const audience = ((PLAYER_FILTERS as readonly string[]).includes(audienceInput) && audienceInput !== "blocked"
    ? audienceInput
    : "active") as PlayerFilter
  const sendEmail = formData.get("sendEmail") === "on"

  if (title.length < 3) return { ok: false, error: "Заголовок слишком короткий" }
  if (body.length < 5) return { ok: false, error: "Напишите текст рассылки" }
  if (ctaUrl && !ctaUrl.startsWith("/") && !ctaUrl.startsWith("https://")) return { ok: false, error: "Ссылка должна начинаться с / или https://" }

  const recipients = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .leftJoin(userVerification, eq(userVerification.userId, user.id))
    .where(and(isNull(user.blockedAt), audienceCondition(audience)))

  if (recipients.length === 0) return { ok: false, error: "Нет получателей для этой аудитории" }

  const href = ctaUrl || null
  for (let i = 0; i < recipients.length; i += 500) {
    await db.insert(notification).values(
      recipients.slice(i, i + 500).map((r) => ({ userId: r.id, kind, title, body, href })),
    )
  }
  for (const r of recipients) void publish(topics.userBalance(r.id))

  if (sendEmail) {
    after(async () => {
      for (const r of recipients) {
        try {
          await sendAdminMessageEmail({
            to: r.email,
            name: r.name,
            title,
            body,
            cta: ctaUrl ? { label: ctaLabel || "Подробнее", url: ctaUrl } : undefined,
          })
        } catch (error) {
          console.error("broadcast mail failed", r.email, error)
        }
        await new Promise((resolve) => setTimeout(resolve, 150))
      }
    })
  }
  return { ok: true, message: `Отправлено ${recipients.length} пользователям${sendEmail ? " (письма уходят в фоне)" : ""}` }
}
