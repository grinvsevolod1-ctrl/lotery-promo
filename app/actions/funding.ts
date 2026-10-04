"use server"

import { and, desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, transaction } from "@/lib/db/schema"
import { notifyTelegram } from "@/lib/telegram"
import { demoCardFingerprint } from "@/lib/demo-card-server"

const MIN_AMOUNT = 10
const MAX_AMOUNT = 10_000

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export type FundingRequestRow = {
  id: number
  type: string
  amount: number
  status: string
  note: string | null
  createdAt: Date
}

export async function getFundingRequests(): Promise<FundingRequestRow[]> {
  const userId = await getUserId()
  return db
    .select({
      id: fundingRequest.id,
      type: fundingRequest.type,
      amount: fundingRequest.amount,
      status: fundingRequest.status,
      note: fundingRequest.note,
      createdAt: fundingRequest.createdAt,
    })
    .from(fundingRequest)
    .where(eq(fundingRequest.userId, userId))
    .orderBy(desc(fundingRequest.createdAt))
    .limit(20)
}

type ActionResult = { ok: true; requestId?: number } | { ok: false; error: string }

export async function getDemoDeposit(id: number) {
  const userId = await getUserId()
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) return null
  const [request] = await db.select({ id: fundingRequest.id, amount: fundingRequest.amount, status: fundingRequest.status }).from(fundingRequest).where(and(
    eq(fundingRequest.id, id), eq(fundingRequest.userId, userId), eq(fundingRequest.type, "deposit"), eq(fundingRequest.note, "demo-only"),
  ))
  return request ?? null
}

export async function completeDemoDeposit(id: number): Promise<ActionResult> {
  const userId = await getUserId()
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) return { ok: false, error: "Некорректная тестовая заявка." }
  const changed = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
    const [request] = await tx.select().from(fundingRequest).where(and(eq(fundingRequest.id, id), eq(fundingRequest.userId, userId), eq(fundingRequest.type, "deposit"), eq(fundingRequest.note, "demo-only")))
    if (!request || request.status !== "awaiting_payment" || !Number.isSafeInteger(request.amount) || request.amount < MIN_AMOUNT || request.amount > MAX_AMOUNT || !request.cardId) return false
    const [card] = await tx.select({ id: paymentCard.id }).from(paymentCard).where(and(eq(paymentCard.id, request.cardId), eq(paymentCard.userId, userId), eq(paymentCard.status, "confirmed"), eq(paymentCard.fingerprint, demoCardFingerprint(userId))))
    if (!card) return false
    const rows = await tx.update(fundingRequest).set({ status: "approved", processedAt: new Date() }).where(and(eq(fundingRequest.id, id), eq(fundingRequest.userId, userId), eq(fundingRequest.status, "awaiting_payment"))).returning({ id: fundingRequest.id })
    if (rows.length !== 1) return false
    await tx.insert(transaction).values({ userId, type: "deposit", amount: request.amount, description: `Тестовое пополнение #${id}: реальные средства не переводились` })
    return true
  })
  if (!changed) return { ok: false, error: "Тестовая ссылка недоступна, карта не подтверждена или заявка уже завершена." }
  void notifyTelegram(`<b>Тестовое пополнение #${id} завершено</b>\nСимуляция: реального списания и оплаты не было.`)
  revalidatePath("/cabinet", "layout")
  return { ok: true }
}

function parseAmount(raw: unknown) {
  if (typeof raw !== "string" && typeof raw !== "number") return null
  const amount = Number(raw)
  if (!Number.isSafeInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) return null
  return amount
}

/** Запрос на пополнение: баланс пополняется только после подтверждения администратором в /admin. */
export async function requestDeposit(cardId: number, amountRaw: unknown): Promise<ActionResult> {
  const userId = await getUserId()
  const amount = parseAmount(amountRaw)
  if (amount === null) return { ok: false, error: `Сумма — от ${MIN_AMOUNT} до ${MAX_AMOUNT} BYN.` }

  const [card] = await db
    .select({ id: paymentCard.id, last4: paymentCard.last4, status: paymentCard.status, fingerprint: paymentCard.fingerprint })
    .from(paymentCard)
    .where(and(eq(paymentCard.id, cardId), eq(paymentCard.userId, userId)))
  if (!card) return { ok: false, error: "Карта не найдена." }
  if (card.fingerprint !== demoCardFingerprint(userId)) return { ok: false, error: "Заявки доступны только для предустановленной тестовой карты. Реальные платежи не поддерживаются." }
  if (card.status !== "confirmed") return { ok: false, error: "Эта карта пока не подтверждена." }

  const [created] = await db
    .insert(fundingRequest)
    .values({ userId, type: "deposit", amount, cardId, status: "pending", note: "demo-only" })
    .returning({ id: fundingRequest.id })

  void notifyTelegram(
    `<b>Тестовое пополнение #${created.id}</b>\nСумма: ${amount} условных единиц. Реальные средства не списываются.`,
    { kind: "funding", id: created.id },
  )

  revalidatePath("/cabinet")
  return { ok: true, requestId: created.id }
}

/**
 * Запрос на вывод: сумма сразу резервируется (списывается с баланса) транзакцией
 * `withdrawal_hold`, чтобы деньги нельзя было вывести дважды. Если админ
 * отклонит заявку, резерв возвращается отдельной транзакцией `withdrawal_refund`.
 */
export async function requestWithdrawal(cardId: number, amountRaw: unknown): Promise<ActionResult> {
  const userId = await getUserId()
  const amount = parseAmount(amountRaw)
  if (amount === null) return { ok: false, error: `Сумма — от ${MIN_AMOUNT} до ${MAX_AMOUNT} BYN.` }

  const [card] = await db
    .select({ id: paymentCard.id, last4: paymentCard.last4, status: paymentCard.status, fingerprint: paymentCard.fingerprint })
    .from(paymentCard)
    .where(and(eq(paymentCard.id, cardId), eq(paymentCard.userId, userId)))
  if (!card) return { ok: false, error: "Карта не найдена." }
  if (card.fingerprint !== demoCardFingerprint(userId)) return { ok: false, error: "Заявки доступны только для предустановленной тестовой карты. Реальные платежи не поддерживаются." }
  if (card.status !== "confirmed") return { ok: false, error: "Эта карта пока не подтверждена." }

  class InsufficientFundsError extends Error {}
  let requestId: number | undefined

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
      const rows = await tx
        .select({ total: sql<number>`coalesce(sum(${transaction.amount}), 0)` })
        .from(transaction)
        .where(eq(transaction.userId, userId))
      const balance = Number(rows[0]?.total ?? 0)
      if (balance < amount) throw new InsufficientFundsError()

      const [created] = await tx
        .insert(fundingRequest)
        .values({ userId, type: "withdrawal", amount, cardId, status: "pending", note: "demo-only" })
        .returning({ id: fundingRequest.id })
      requestId = created.id

      await tx.insert(transaction).values({
        userId,
        type: "withdrawal_hold",
        amount: -amount,
        description: `Заявка на вывод #${created.id} — ожидает подтверждения`,
      })
    })
  } catch (e) {
    if (e instanceof InsufficientFundsError) return { ok: false, error: "Недостаточно средств на балансе." }
    throw e
  }

  void notifyTelegram(
    `<b>Тестовый вывод #${requestId}</b>\nСумма: ${amount} условных единиц. Реальных переводов нет.`,
    requestId ? { kind: "funding", id: requestId } : undefined,
  )

  revalidatePath("/cabinet")
  return { ok: true, requestId }
}
