import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, referral, transaction } from "@/lib/db/schema"
import type { ReviewDecision, ReviewTarget } from "@/lib/telegram-security"
import { nextReviewStatus } from "@/lib/review-transitions"
import { rewardReferrer } from "@/lib/referrals"
import { CARD_EVENT_FOR_STATUS, emitCardEvent } from "@/lib/card-webhook"
import { notifyCardChange } from "@/lib/realtime"
import { formatByn, notify, type NewNotification } from "@/lib/notifications"

export async function getReviewResult(target: ReviewTarget) {
  if (target.kind === "referral") {
    const [row] = await db.select({ status: referral.status }).from(referral).where(eq(referral.id, target.id))
    return row ? { status: row.status, type: "referral" as const } : null
  }
  if (target.kind === "card") {
    const [row] = await db.select({ status: paymentCard.status }).from(paymentCard).where(eq(paymentCard.id, target.id))
    return row ? { status: row.status, type: "card" as const } : null
  }
  if (target.kind === "funding") {
    const [row] = await db.select({ status: fundingRequest.status }).from(fundingRequest).where(eq(fundingRequest.id, target.id))
    return row ? { status: row.status, type: "funding" as const } : null
  }
  return null
}

/** Saves the admin's free-text extra-check question so the user's cabinet can show it. */
export async function setExtraCheckMessage(cardId: number, message: string) {
  if (!Number.isInteger(cardId) || cardId <= 0 || cardId > 2147483647) return false
  const rows = await db.update(paymentCard).set({ extraCheckMessage: message })
    .where(and(eq(paymentCard.id, cardId), eq(paymentCard.status, "extra_check")))
    .returning({ id: paymentCard.id, userId: paymentCard.userId })
  if (rows.length === 1) {
    emitCardEvent(cardId, "card.extra_check_requested")
    await notifyCardChange(rows[0].userId)
  }
  return rows.length === 1
}

type CardReviewExtras = { resultReason?: string | null; extraCheckMessage?: string }

export async function processReview(target: ReviewTarget, decision: ReviewDecision, cardExtras: CardReviewExtras = {}) {
  if (!Number.isInteger(target.id) || target.id <= 0 || target.id > 2147483647) return false
  const status = nextReviewStatus(target.kind, "pending", decision)
  if (!status) return false
  if (target.kind === "referral") {
    const rows = await db.update(referral).set({ status, processedAt: new Date() })
      .where(and(eq(referral.id, target.id), eq(referral.status, "pending")))
      .returning({ id: referral.id })
    return rows.length === 1
  }
  if (target.kind === "card") {
    const changed = await db.transaction(async (tx) => {
      // A repeated extra check must start from a blank question, otherwise the cabinet shows the old one.
      const resetExtra = status === "extra_check"
        ? { extraCheckMessage: cardExtras.extraCheckMessage ?? null, extraCheckResponse: null }
        : {}
      const reason = "resultReason" in cardExtras ? { resultReason: cardExtras.resultReason ?? null } : {}
      const [row] = await tx.update(paymentCard).set({ status, processedAt: new Date(), ...resetExtra, ...reason })
        .where(and(eq(paymentCard.id, target.id), eq(paymentCard.status, "pending")))
        .returning({ id: paymentCard.id, userId: paymentCard.userId })
      if (!row) return null
      if (status === "confirmed") {
        const [existingDefault] = await tx.select({ id: paymentCard.id }).from(paymentCard)
          .where(and(eq(paymentCard.userId, row.userId), eq(paymentCard.isDefault, true))).limit(1)
        if (!existingDefault) await tx.update(paymentCard).set({ isDefault: true }).where(eq(paymentCard.id, row.id))
        await rewardReferrer(tx, row.userId)
      }
      const notice = CARD_NOTICE[status]
      if (notice) await notify(tx, row.userId, notice)
      return row.userId
    })
    if (changed) await notifyCardChange(changed)
    const event = CARD_EVENT_FOR_STATUS[status]
    if (changed && event && (status !== "extra_check" || cardExtras.extraCheckMessage)) emitCardEvent(target.id, event)
    return Boolean(changed)
  }
  if (target.kind === "funding") {
    return db.transaction(async (tx) => {
      const [row] = await tx.update(fundingRequest).set({ status, processedAt: new Date() })
        .where(and(eq(fundingRequest.id, target.id), eq(fundingRequest.status, "pending")))
        .returning({ userId: fundingRequest.userId, type: fundingRequest.type, amount: fundingRequest.amount })
      if (!row) return false
      // The amount was reserved when the withdrawal was requested; a rejection gives it back.
      if (row.type === "withdrawal" && status === "rejected") {
        await tx.insert(transaction).values({
          userId: row.userId,
          type: "withdrawal_refund",
          amount: row.amount,
          description: `Возврат: заявка на вывод #${target.id} отклонена`,
        })
      }
      if (row.type === "deposit" && status === "approved") {
        await tx.insert(transaction).values({
          userId: row.userId,
          type: "deposit",
          amount: row.amount,
          description: `Пополнение баланса #${target.id}`,
        })
      }
      await notify(tx, row.userId, fundingNotice(target.id, row.type, status, row.amount))
      return true
    })
  }
  return false
}

function fundingNotice(id: number, type: string, status: string, amount: number): NewNotification {
  const sum = formatByn(amount)
  if (type === "deposit") {
    return status === "approved"
      ? { kind: "money", title: `Баланс пополнен на ${sum}`, body: `Заявка #${id} подтверждена. Проверьте бонусы — за депозит положен подарок.`, href: "/cabinet/bonuses" }
      : { kind: "money", title: `Пополнение #${id} отклонено`, body: `Списание ${sum} не прошло. Попробуйте другую карту или криптовалюту.`, href: "/cabinet/deposit" }
  }
  return status === "approved"
    ? { kind: "money", title: `Вывод ${sum} отправлен`, body: `Заявка #${id} подтверждена — средства уже в пути.`, href: "/cabinet/deposit?tab=withdraw" }
    : { kind: "money", title: `Вывод #${id} отклонён`, body: `${sum} вернулись на игровой баланс.`, href: "/cabinet/deposit?tab=withdraw" }
}

const CARD_NOTICE: Record<string, NewNotification> = {
  confirmed: { kind: "card", title: "Карта подтверждена", body: "Теперь с неё можно пополнять и выводить. Заберите бонус за привязку карты!", href: "/cabinet/bonuses" },
  rejected: { kind: "card", title: "Карта не прошла проверку", body: "Откройте раздел карт, чтобы узнать причину и привязать другую.", href: "/cabinet/cards" },
  extra_check: { kind: "card", title: "Нужна дополнительная проверка карты", body: "Ответьте на вопрос в разделе карт, чтобы завершить привязку.", href: "/cabinet/cards" },
}
