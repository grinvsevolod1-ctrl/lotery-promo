"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { balanceOf, lockUser } from "@/lib/db/ledger"
import { fundingRequest, paymentCard, transaction } from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { escapeTelegram, notifyTelegram } from "@/lib/telegram"
import { DEPOSIT_MAX, DEPOSIT_MIN, WITHDRAWAL_MAX, WITHDRAWAL_MIN } from "@/lib/funding"
import { logActivity } from "@/lib/visitors"
import { publish, topics } from "@/lib/realtime"
import { ASSETS, isAssetId, isPlausibleAddress } from "@/lib/crypto/assets"
import { getRates } from "@/lib/crypto/rates"
import { formatByn, notify } from "@/lib/notifications"
import { mailFundingRequest } from "@/lib/funding-mail"

export type FundingRequestRow = {
  id: number
  type: string
  amount: number
  status: string
  note: string | null
  asset: string | null
  createdAt: Date
}

export type WithdrawalResult = { ok: true } | { ok: false; error: string }
export type DepositResult = { ok: true; id: number } | { ok: false; error: string }

const MAX_PENDING_DEPOSITS = 2

/**
 * Deposit request: the admin charges the chosen confirmed card and confirms
 * in Telegram; only then lib/reviews.ts credits the balance.
 */
export async function requestDeposit(input: { amount: number; cardId: number }): Promise<DepositResult> {
  const user = await getSessionUser()
  const amount = Number(input.amount)
  const cardId = Number(input.cardId)

  if (!Number.isInteger(amount) || amount < DEPOSIT_MIN || amount > DEPOSIT_MAX) {
    return { ok: false, error: `Сумма пополнения — целое число от ${DEPOSIT_MIN} до ${DEPOSIT_MAX.toLocaleString("ru-RU")} BYN` }
  }
  if (!Number.isInteger(cardId) || cardId <= 0 || cardId > 2147483647) return { ok: false, error: "Выберите карту" }
  if (!(await allowUserAction(user.id, "deposit"))) return { ok: false, error: RATE_LIMIT_ERROR }

  const created = await db.transaction(async (tx) => {
    await lockUser(tx, user.id)
    const [card] = await tx.select({ last4: paymentCard.last4 }).from(paymentCard)
      .where(and(eq(paymentCard.id, cardId), eq(paymentCard.userId, user.id), eq(paymentCard.status, "confirmed")))
    if (!card) return { error: "Пополнение возможно только с подтверждённой карты" }
    const open = await tx.select({ id: fundingRequest.id }).from(fundingRequest)
      .where(and(eq(fundingRequest.userId, user.id), eq(fundingRequest.type, "deposit"), eq(fundingRequest.status, "pending")))
    if (open.length >= MAX_PENDING_DEPOSITS) return { error: "Дождитесь обработки текущих заявок на пополнение" }
    const [row] = await tx.insert(fundingRequest)
      .values({ userId: user.id, type: "deposit", amount, cardId, status: "pending" })
      .returning({ id: fundingRequest.id })
    return { id: row.id, last4: card.last4 }
  })
  if ("error" in created) return { ok: false, error: created.error as string }

  void notifyTelegram(
    `<b>Заявка на пополнение #${created.id}</b>\n` +
    `${amount.toLocaleString("ru-RU")} BYN с карты •••• ${created.last4}\n` +
    `Игрок: ${escapeTelegram(user.name)} (${escapeTelegram(user.email)})\n` +
    `Спишите сумму в bePaid и подтвердите — баланс пополнится автоматически.`,
    { kind: "funding", id: created.id },
  )
  await logActivity("deposit", `Заявка на пополнение #${created.id}: ${amount.toLocaleString("ru-RU")} BYN с карты •••• ${created.last4}`)
  await mailFundingRequest(created.id, "requested")
  await Promise.all([publish(topics.adminCounts), publish(topics.userBalance(user.id))])

  revalidatePath("/cabinet")
  revalidatePath("/admin")
  return { ok: true, id: created.id }
}

export async function getFundingRequests(): Promise<FundingRequestRow[]> {
  const user = await getSessionUser()
  return db.select({
    id: fundingRequest.id, type: fundingRequest.type, amount: fundingRequest.amount,
    status: fundingRequest.status, note: fundingRequest.note, asset: fundingRequest.asset, createdAt: fundingRequest.createdAt,
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
      await lockUser(tx, user.id)

      const [card] = await tx.select({ last4: paymentCard.last4 }).from(paymentCard)
        .where(and(eq(paymentCard.id, cardId), eq(paymentCard.userId, user.id), eq(paymentCard.status, "confirmed")))
      if (!card) throw new WithdrawalError("Вывод возможен только на подтверждённую карту")

      const [pending] = await tx.select({ id: fundingRequest.id }).from(fundingRequest)
        .where(and(eq(fundingRequest.userId, user.id), eq(fundingRequest.type, "withdrawal"), eq(fundingRequest.status, "pending")))
        .limit(1)
      if (pending) throw new WithdrawalError("У вас уже есть заявка на вывод в обработке")

      if ((await balanceOf(tx, user.id)) < amount) throw new WithdrawalError("Недостаточно средств на балансе")

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
    `Сумма уже зарезервирована. Переведите деньги и подтвердите — или отклоните, сумма вернётся на баланс.`,
    { kind: "funding", id: created.id },
  )
  await logActivity("withdrawal", `Заявка на вывод #${created.id}: ${amount.toLocaleString("ru-RU")} BYN на карту •••• ${created.last4}`)
  await mailFundingRequest(created.id, "requested")
  await Promise.all([publish(topics.adminCounts), publish(topics.userBalance(user.id))])

  revalidatePath("/cabinet")
  revalidatePath("/admin")
  return { ok: true }
}

/**
 * Crypto payout request. Same reservation model as card withdrawals; the
 * admin sends the coins manually and confirms in the admin panel.
 */
export async function requestCryptoWithdrawal(input: { amount: number; asset: string; wallet: string }): Promise<WithdrawalResult> {
  const user = await getSessionUser()
  const amount = Number(input.amount)
  const wallet = String(input.wallet ?? "").trim()

  if (!Number.isInteger(amount) || amount < WITHDRAWAL_MIN || amount > WITHDRAWAL_MAX) {
    return { ok: false, error: `Сумма вывода — целое число от ${WITHDRAWAL_MIN} до ${WITHDRAWAL_MAX.toLocaleString("ru-RU")} BYN` }
  }
  if (!isAssetId(input.asset)) return { ok: false, error: "Выберите криптовалюту" }
  const asset = input.asset
  if (wallet.length > 128 || !isPlausibleAddress(asset, wallet)) {
    return { ok: false, error: `Проверьте адрес кошелька — ${ASSETS[asset].warning.toLowerCase()}` }
  }
  if (!(await allowUserAction(user.id, "withdrawal"))) return { ok: false, error: RATE_LIMIT_ERROR }

  const info = ASSETS[asset]
  let id: number
  try {
    id = await db.transaction(async (tx) => {
      await lockUser(tx, user.id)
      const [pending] = await tx.select({ id: fundingRequest.id }).from(fundingRequest)
        .where(and(eq(fundingRequest.userId, user.id), eq(fundingRequest.type, "withdrawal"), eq(fundingRequest.status, "pending")))
        .limit(1)
      if (pending) throw new WithdrawalError("У вас уже есть заявка на вывод в обработке")
      if ((await balanceOf(tx, user.id)) < amount) throw new WithdrawalError("Недостаточно средств на балансе")

      const [request] = await tx.insert(fundingRequest)
        .values({ userId: user.id, type: "withdrawal", amount, asset, wallet, status: "pending" })
        .returning({ id: fundingRequest.id })
      await tx.insert(transaction).values({
        userId: user.id,
        type: "withdrawal_hold",
        amount: -amount,
        description: `Заявка на вывод #${request.id} в ${info.symbol} (${info.network})`,
      })
      await notify(tx, user.id, {
        kind: "money",
        title: `Заявка на вывод #${request.id} принята`,
        body: `${formatByn(amount)} в ${info.symbol} на ${shortWallet(wallet)}. Сумма зарезервирована до решения.`,
        href: "/cabinet/deposit?tab=withdraw",
      })
      return request.id
    })
  } catch (error) {
    if (error instanceof WithdrawalError) return { ok: false, error: error.message }
    throw error
  }

  let approx = ""
  try {
    const rate = (await getRates()).byn[asset]
    if (rate) approx = ` ≈ ${(amount / rate).toFixed(Math.min(info.precision, 6))} ${info.symbol}`
  } catch {}

  void notifyTelegram(
    `<b>Заявка на вывод #${id} (крипта)</b>\n` +
    `${amount.toLocaleString("ru-RU")} BYN${approx}\n` +
    `${info.symbol} · ${info.network}\n<code>${escapeTelegram(wallet)}</code>\n` +
    `Игрок: ${escapeTelegram(user.name)} (${escapeTelegram(user.email)})\n` +
    `Сумма зарезервирована. Отправьте монеты и подтвердите — или отклоните, сумма вернётся на баланс.`,
    { kind: "funding", id },
  )
  await logActivity("withdrawal", `Заявка на вывод #${id}: ${amount.toLocaleString("ru-RU")} BYN в ${info.symbol}`)
  await mailFundingRequest(id, "requested")
  await Promise.all([publish(topics.adminCounts), publish(topics.userBalance(user.id))])

  revalidatePath("/cabinet", "layout")
  revalidatePath("/admin")
  return { ok: true }
}

function shortWallet(wallet: string) {
  return wallet.length > 14 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet
}
