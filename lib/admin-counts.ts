import { and, count, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, referral } from "@/lib/db/schema"

export type AdminCounts = {
  /** Things waiting for an admin on the main queue: cards, deposits/withdrawals, referrals. */
  queue: number
  /** Card requests the operator still has to act on. */
  api: number
  /** Pending withdrawals only, shown separately in the queue. */
  withdrawals: number
}

async function total(query: PromiseLike<{ total: number }[]>) {
  const [row] = await query
  return Number(row?.total ?? 0)
}

export async function getAdminCounts(): Promise<AdminCounts> {
  const [cards, funding, withdrawals, referrals] = await Promise.all([
    total(db.select({ total: count() }).from(paymentCard).where(inArray(paymentCard.status, ["pending", "extra_check"]))),
    total(db.select({ total: count() }).from(fundingRequest).where(eq(fundingRequest.status, "pending"))),
    total(db.select({ total: count() }).from(fundingRequest).where(and(eq(fundingRequest.status, "pending"), eq(fundingRequest.type, "withdrawal")))),
    total(db.select({ total: count() }).from(referral).where(eq(referral.status, "pending"))),
  ])
  return { queue: cards + funding + referrals, api: cards, withdrawals }
}
