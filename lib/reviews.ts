import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, referral, transaction } from "@/lib/db/schema"
import { demoCardFingerprint } from "@/lib/demo-card-server"
import type { ReviewDecision, ReviewTarget } from "@/lib/telegram-security"
import { nextReviewStatus } from "@/lib/review-transitions"

export async function getReviewResult(target: ReviewTarget) {
  if (target.kind === "funding") {
    const [row] = await db.select({ status: fundingRequest.status, type: fundingRequest.type }).from(fundingRequest).where(and(eq(fundingRequest.id, target.id), eq(fundingRequest.note, "demo-only")))
    return row ?? null
  }
  const table = target.kind === "card" ? paymentCard : referral
  const [row] = await db.select({ status: table.status }).from(table).where(eq(table.id, target.id))
  return row ? { status: row.status, type: target.kind } : null
}

export async function processReview(target: ReviewTarget, decision: ReviewDecision) {
  if (!Number.isInteger(target.id) || target.id <= 0 || target.id > 2147483647) return false
  if (!["approve", "reject", "code", "extra", "checkout"].includes(decision)) return false
  return db.transaction(async (tx) => {
    if (target.kind === "referral") {
      const status = nextReviewStatus("referral", "pending", decision)
      if (!status) return false
      const rows = await tx.update(referral).set({ status, processedAt: new Date() }).where(and(eq(referral.id, target.id), eq(referral.status, "pending"))).returning({ id: referral.id })
      return rows.length === 1
    }
    if (target.kind === "card") {
      const [card] = await tx.select({ userId: paymentCard.userId, fingerprint: paymentCard.fingerprint, status: paymentCard.status }).from(paymentCard).where(eq(paymentCard.id, target.id))
      if (!card || card.fingerprint !== demoCardFingerprint(card.userId)) return false
      const status = nextReviewStatus("card", card.status, decision)
      if (!status) return false
      const rows = await tx.update(paymentCard).set({ status }).where(and(eq(paymentCard.id, target.id), eq(paymentCard.userId, card.userId), eq(paymentCard.status, card.status))).returning({ id: paymentCard.id })
      return rows.length === 1
    }
    if (target.kind !== "funding") return false
    const [request] = await tx.select().from(fundingRequest).where(eq(fundingRequest.id, target.id))
    if (!request || request.note !== "demo-only" || !Number.isInteger(request.amount) || request.amount <= 0 || !["deposit", "withdrawal"].includes(request.type)) return false
    const status = nextReviewStatus("funding", request.status, decision, request.type)
    if (!status) return false
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${request.userId}))`)
    const changed = await tx.update(fundingRequest).set({ status, processedAt: status === "awaiting_payment" ? null : new Date() }).where(and(eq(fundingRequest.id, target.id), eq(fundingRequest.userId, request.userId), eq(fundingRequest.status, request.status))).returning({ id: fundingRequest.id })
    if (changed.length !== 1) return false
    if (decision === "reject" && request.type === "withdrawal") {
      await tx.insert(transaction).values({ userId: request.userId, type: "withdrawal_refund", amount: request.amount, description: `Возврат тестового резерва #${request.id}` })
    }
    return true
  })
}
