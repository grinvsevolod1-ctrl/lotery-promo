"use server"

import { and, desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, transaction } from "@/lib/db/schema"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { escapeTelegram, notifyTelegram } from "@/lib/telegram"
import { WITHDRAWAL_MAX, WITHDRAWAL_MIN } from "@/lib/funding"

export type FundingRequestRow = {
  id: number
  type: string
  amount: number
  status: string
  note: string | null
  createdAt: Date
}

export type WithdrawalResult = { ok: true } | { ok: false; error: string }

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

export async function getFundingRequests(): Promise<FundingRequestRow[]> {
  const user = await getSessionUser()
  return db.select({
    id: fundingRequest.id, type: fundingRequest.type, amount: fundingRequest.amount,
    status: fundingRequest.status, note: fundingRequest.note, createdAt: fundingRequest.createdAt,
  }).from(fundingRequest)
    .where(eq(fundingRequest.userId, user.id))
    .orderBy(desc(fundingRequest.createdAt)).limit(20)
}

class WithdrawalError extends Error {}

/**
 * Creates a withdrawal request and reserves the money in the same transaction:
 * a negative "withdrawal_hold" entry lowers the balance at once, so the player
 * cannot spend the requested amount on tickets while the admin reviews it.
 * Rejecting the request writes a matching refund (see lib/reviews.ts).
 */
export async function requestWithdrawal(input: { amount: number; cardId: number }): Promise<WithdrawalResult> {
  const user = await getSessionUser()
  const amount = Number(input.amount)
  const cardId = Number(input.cardId)

  if (!Number.isInteger(amount) || amount < WITHDRAWAL_MIN || amount > WITHDRAWAL_MAX) {
    return { ok: false, error: `Сумма вывода — целое число от ${WITHDRAWAL_MIN} до ${WITHDRAWAL_MAX.toLocaleString("ru-RU")} BYN` }
  }
  if (!Number.isInteger(cardId) || cardId <= 0 || cardId > 2147483647) {
    return { ok: false, error: "Выберите карту для вывода" }
  }
  if (!(await allowUserAction(user.id, "withdrawal"))) return { ok: false, error: RATE_LIMIT_ERROR }

  let created: { id: number; last4: string }
  try {
    created = await db.transaction(async (tx) => {
      // Same per-user lock as ticket purchases: a purchase and a withdrawal
      // can never both pass the balance check with money for only one.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`)

      const [card] = await tx.select({ last4: paymentCard.last4 }).from(paymentCard)
        .where(and(eq(paymentCard.id, cardId), eq(paymentCard.userId, user.id), eq(paymentCard.status, "confirmed")))
      if (!card) throw new WithdrawalError("Вывод возможен только на подтверждённую карту")

      const [pending] = await tx.select({ id: fundingRequest.id }).from(fundingRequest)
        .where(and(eq(fundingRequest.userId, user.id), eq(fundingRequest.type, "withdrawal"), eq(fundingRequest.status, "pending")))
        .limit(1)
      if (pending) throw new WithdrawalError("У вас уже есть заявка на вывод в обработке")

      const [balanceRow] = await tx
        .select({ total: sql<number>`coalesce(sum(${transaction.amount}), 0)` })
        .from(transaction)
        .where(eq(transaction.userId, user.id))
      if (Number(balanceRow?.total ?? 0) < amount) throw new WithdrawalError("Недостаточно средств на балансе")

      const [request] = await tx.insert(fundingRequest)
        .values({ userId: user.id, type: "withdrawal", amount, cardId, status: "pending" })
        .returning({ id: fundingRequest.id })

      await tx.insert(transaction).values({
        userId: user.id,
        type: "withdrawal_hold",
        amount: -amount,
        description: `Заявка на вывод #${request.id} на карту •••• ${card.last4}`,
      })

      return { id: request.id, last4: card.last4 }
    })
  } catch (error) {
    if (error instanceof WithdrawalError) return { ok: false, error: error.message }
    throw error
  }

  void notifyTelegram(
    `<b>Заявка на вывод #${created.id}</b>\n` +
    `${amount.toLocaleString("ru-RU")} BYN на карту •••• ${created.last4}\n` +
    `Игрок: ${escapeTelegram(user.name)} (${escapeTelegram(user.email)})\n` +
    `Сумма уже зарезервирована. Одобрить или отклонить: /admin`,
  )

  revalidatePath("/cabinet")
  revalidatePath("/admin")
  return { ok: true }
}
