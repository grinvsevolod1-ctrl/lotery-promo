import { describe, expect, it } from "vitest"
import { nextReviewStatus } from "@/lib/review-transitions"

describe("review transitions", () => {
  it("keeps every funding decision disabled until a payment provider is connected", () => {
    for (const status of ["pending", "awaiting_payment", "approved"]) {
      for (const decision of ["approve", "reject", "code", "extra", "checkout"] as const) {
        expect(nextReviewStatus("funding", status, decision)).toBeNull()
      }
    }
  })

  it("supports manual card review from pending only", () => {
    expect(nextReviewStatus("card", "pending", "reject")).toBe("rejected")
    expect(nextReviewStatus("card", "pending", "code")).toBe("code_requested")
    expect(nextReviewStatus("card", "pending", "extra")).toBe("extra_check")
    expect(nextReviewStatus("card", "pending", "approve")).toBe("confirmed")
    expect(nextReviewStatus("card", "pending", "checkout")).toBeNull()
    for (const status of ["code_requested", "extra_check", "confirmed", "rejected"]) {
      for (const decision of ["approve", "reject", "code", "extra", "checkout"] as const) {
        expect(nextReviewStatus("card", status, decision)).toBeNull()
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
