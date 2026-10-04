import { describe, expect, it } from "vitest"
import { reviewFeedback } from "@/lib/review-feedback"

describe("Telegram review feedback", () => {
  it("never issues a simulated link or bank code for legacy payment callbacks", () => {
    for (const kind of ["card", "funding"] as const) {
      for (const status of ["awaiting_payment", "code_required", "extra_required", "approved", "rejected"]) {
        const text = reviewFeedback({ kind, id: 7 }, { type: kind, status })
        expect(text).toContain("недоступны")
        expect(text).not.toContain("/pay/")
        expect(text).not.toContain("TEST-123")
        expect(text).not.toContain("зачислен")
      }
    }
  })
  it("reports real referral decisions", () => {
    expect(reviewFeedback({ kind: "referral", id: 7 }, { type: "referral", status: "approved" })).toBe("Приглашение подтверждено.")
    expect(reviewFeedback({ kind: "referral", id: 7 }, { type: "referral", status: "rejected" })).toBe("Приглашение отклонено.")
  })
})
