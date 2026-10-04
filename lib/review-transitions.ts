import type { ReviewDecision, ReviewKind } from "@/lib/telegram-security"

export function nextReviewStatus(kind: ReviewKind, status: string, decision: ReviewDecision, fundingType?: string): string | null {
  if (kind === "card") {
    if (decision === "reject" && ["pending", "code_required", "extra_required"].includes(status)) return "rejected"
    if (status !== "pending") return null
    return ({ approve: "confirmed", reject: "rejected", code: "code_required", extra: "extra_required", checkout: null })[decision]
  }
  if (kind === "referral") {
    if (status !== "pending" || !["approve", "reject"].includes(decision)) return null
    return decision === "approve" ? "approved" : "rejected"
  }
  if (decision === "reject" && ["pending", "awaiting_payment"].includes(status)) return "rejected"
  if (status !== "pending") return null
  if (fundingType === "deposit" && ["approve", "checkout"].includes(decision)) return "awaiting_payment"
  if (fundingType === "withdrawal" && decision === "approve") return "approved"
  return null
}

export function demoPaymentPath(id: number) {
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) throw new Error("Invalid demo request")
  return `/pay/demo/${id}`
}
