import type { ReviewDecision, ReviewKind } from "@/lib/telegram-security"

export function nextReviewStatus(kind: ReviewKind, status: string, decision: ReviewDecision): string | null {
  if (status !== "pending") return null
  if (kind === "referral") {
    if (!["approve", "reject"].includes(decision)) return null
    return decision === "approve" ? "approved" : "rejected"
  }
  if (kind === "card") {
    if (decision === "reject") return "rejected"
    if (decision === "code") return "code_requested"
    if (decision === "extra") return "extra_check"
    return null
  }
  return null
}
