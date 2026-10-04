import type { ReviewDecision, ReviewKind } from "@/lib/telegram-security"

export function nextReviewStatus(kind: ReviewKind, status: string, decision: ReviewDecision): string | null {
  if (kind !== "referral" || status !== "pending" || !["approve", "reject"].includes(decision)) return null
  return decision === "approve" ? "approved" : "rejected"
}
