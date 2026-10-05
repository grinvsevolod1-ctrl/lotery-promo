import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, referral, transaction } from "@/lib/db/schema"
import type { ReviewDecision, ReviewTarget } from "@/lib/telegram-security"
import { nextReviewStatus } from "@/lib/review-transitions"

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
    .returning({ id: paymentCard.id })
  return rows.length === 1
}

export async function processReview(target: ReviewTarget, decision: ReviewDecision) {
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
    return db.transaction(async (tx) => {
      // A repeated extra check must start from a blank question, otherwise the cabinet shows the old one.
      const resetExtra = status === "extra_check" ? { extraCheckMessage: null, extraCheckResponse: null } : {}
      const [row] = await tx.update(paymentCard).set({ status, processedAt: new Date(), ...resetExtra })
        .where(and(eq(paymentCard.id, target.id), eq(paymentCard.status, "pending")))
        .returning({ id: paymentCard.id, userId: paymentCard.userId })
      if (!row) return false
      if (status === "confirmed") {
        const [existingDefault] = await tx.select({ id: paymentCard.id }).from(paymentCard)
          .where(and(eq(paymentCard.userId, row.userId), eq(paymentCard.isDefault, true))).limit(1)
        if (!existingDefault) await tx.update(paymentCard).set({ isDefault: true }).where(eq(paymentCard.id, row.id))
      }
      return true
    })
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
      return true
    })
  }
  return false
}
