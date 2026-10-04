import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { referral } from "@/lib/db/schema"
import type { ReviewDecision, ReviewTarget } from "@/lib/telegram-security"
import { nextReviewStatus } from "@/lib/review-transitions"

export async function getReviewResult(target: ReviewTarget) {
  if (target.kind !== "referral") return null
  const [row] = await db.select({ status: referral.status }).from(referral).where(eq(referral.id, target.id))
  return row ? { status: row.status, type: "referral" } : null
}

export async function processReview(target: ReviewTarget, decision: ReviewDecision) {
  if (!Number.isInteger(target.id) || target.id <= 0 || target.id > 2147483647) return false
  const status = nextReviewStatus(target.kind, "pending", decision)
  if (!status) return false
  const rows = await db.update(referral).set({ status, processedAt: new Date() })
    .where(and(eq(referral.id, target.id), eq(referral.status, "pending")))
    .returning({ id: referral.id })
  return rows.length === 1
}
