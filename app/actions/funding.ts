"use server"

import { and, desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, transaction } from "@/lib/db/schema"
import { notifyTelegram } from "@/lib/telegram"

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

type ActionResult = { ok: true } | { ok: false; error: string }

function parseAmount(raw: unknown) {
  const amount = Math.trunc(Number(raw))
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) return null
  return amount
}

/** Запрос на пополнение: баланс пополняется только после подтверждения администратором в /admin. */
export async function requestDeposit(cardId: number, amountRaw: unknown): Promise<ActionResult> {
  const userId = await getUserId()
  const amount = parseAmount(amountRaw)
  if (amount === null) return { ok: false, error: `Сумма — от ${MIN_AMOUNT} до ${MAX_AMOUNT} BYN.` }

  const [card] = await db
    .select({ id: paymentCard.id, last4: paymentCard.last4, status: paymentCard.status })
    .from(paymentCard)
    .where(and(eq(paymentCard.id, cardId), eq(paymentCard.userId, userId)))
  if (!card) return { ok: false, error: "Карта не найдена." }
  if (card.status !== "confirmed") return { ok: false, error: "Эта карта пока не подтверждена." }

  const [created] = await db
    .insert(fundingRequest)
    .values({ userId, type: "deposit", amount, cardId, status: "pending" })
    .returning({ id: fundingRequest.id })

  void notifyTelegram(
    `<b>Заявка на пополнение #${created.id}</b>\nТребует подтверждения в /admin\nСумма: ${amount} BYN\nКарта: •••• ${card.last4}`,
  )

  revalidatePath("/cabinet")
  return { ok: true }
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
    .select({ id: paymentCard.id, last4: paymentCard.last4, status: paymentCard.status })
    .from(paymentCard)
    .where(and(eq(paymentCard.id, cardId), eq(paymentCard.userId, userId)))
  if (!card) return { ok: false, error: "Карта не найдена." }
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
        .values({ userId, type: "withdrawal", amount, cardId, status: "pending" })
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
    `<b>Заявка на вывод #${requestId}</b>\nТребует подтверждения в /admin\nСумма: ${amount} BYN\nКарта: •••• ${card.last4}`,
  )

  revalidatePath("/cabinet")
  return { ok: true }
}
