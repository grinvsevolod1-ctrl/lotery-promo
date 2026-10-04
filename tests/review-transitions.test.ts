import { describe, expect, it } from "vitest"
import { nextReviewStatus } from "@/lib/review-transitions"

describe("review transitions without payment simulation", () => {
  it("disables every card and funding decision until a provider is connected", () => {
    for (const kind of ["card", "funding"] as const) {
      for (const status of ["pending", "code_required", "extra_required", "awaiting_payment", "confirmed", "approved"]) {
        for (const decision of ["approve", "reject", "code", "extra", "checkout"] as const) {
          expect(nextReviewStatus(kind, status, decision)).toBeNull()
        }
      }
    }
  })
  it("preserves real referral moderation", () => {
    expect(nextReviewStatus("referral", "pending", "approve")).toBe("approved")
    expect(nextReviewStatus("referral", "pending", "reject")).toBe("rejected")
    expect(nextReviewStatus("referral", "approved", "reject")).toBeNull()
    expect(nextReviewStatus("referral", "pending", "code")).toBeNull()
    expect(nextReviewStatus("referral", "pending", "checkout")).toBeNull()
  })
})
