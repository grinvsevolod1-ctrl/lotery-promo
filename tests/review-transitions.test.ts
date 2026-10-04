import { describe, expect, it } from "vitest"
import { demoPaymentPath, nextReviewStatus } from "@/lib/review-transitions"

describe("demo review transitions", () => {
  it("requests synthetic code and extra checks only for pending cards", () => {
    expect(nextReviewStatus("card", "pending", "code")).toBe("code_required")
    expect(nextReviewStatus("card", "pending", "extra")).toBe("extra_required")
    expect(nextReviewStatus("card", "pending", "approve")).toBe("confirmed")
    expect(nextReviewStatus("card", "code_required", "approve")).toBeNull()
    expect(nextReviewStatus("card", "extra_required", "reject")).toBe("rejected")
    expect(nextReviewStatus("card", "confirmed", "reject")).toBeNull()
  })
  it("issues a demo link rather than crediting a deposit on admin approval", () => {
    expect(nextReviewStatus("funding", "pending", "approve", "deposit")).toBe("awaiting_payment")
    expect(nextReviewStatus("funding", "pending", "checkout", "deposit")).toBe("awaiting_payment")
    expect(nextReviewStatus("funding", "awaiting_payment", "approve", "deposit")).toBeNull()
    expect(nextReviewStatus("funding", "awaiting_payment", "reject", "deposit")).toBe("rejected")
    expect(nextReviewStatus("funding", "approved", "reject", "deposit")).toBeNull()
  })
  it("does not accept card challenges or payment links for other requests", () => {
    expect(nextReviewStatus("funding", "pending", "code", "deposit")).toBeNull()
    expect(nextReviewStatus("funding", "pending", "checkout", "withdrawal")).toBeNull()
    expect(nextReviewStatus("funding", "pending", "approve", "withdrawal")).toBe("approved")
    expect(nextReviewStatus("referral", "pending", "code")).toBeNull()
    expect(nextReviewStatus("referral", "pending", "approve")).toBe("approved")
  })
  it("constructs only internal payment paths", () => {
    expect(demoPaymentPath(123)).toBe("/pay/demo/123")
    for (const id of [0, -1, 1.5, NaN, Infinity, 2147483648]) expect(() => demoPaymentPath(id)).toThrow()
  })
})
