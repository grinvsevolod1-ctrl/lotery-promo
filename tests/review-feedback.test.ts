import { describe, expect, it } from "vitest"
import { reviewFeedback } from "@/lib/review-feedback"

const forbidden = ["/pay/", "TEST-123", "зачислен"]

describe("Telegram review feedback", () => {
  it("never issues a simulated link or bank code for funding callbacks", () => {
    for (const status of ["awaiting_payment", "pending", "approved", "rejected"]) {
      const text = reviewFeedback({ kind: "funding", id: 7 }, { type: "funding", status })
      expect(text).toContain("недоступны")
      for (const fragment of forbidden) expect(text).not.toContain(fragment)
    }
  })

  it("reports manual card review decisions without payment artifacts", () => {
    expect(reviewFeedback({ kind: "card", id: 7 }, { type: "card", status: "confirmed" })).toContain("подтверждена")
    expect(reviewFeedback({ kind: "card", id: 7 }, { type: "card", status: "rejected" })).toBe("Заявка на карту отклонена.")
    expect(reviewFeedback({ kind: "card", id: 7 }, { type: "card", status: "code_requested" })).toContain("запрошен код")
    expect(reviewFeedback({ kind: "card", id: 7 }, { type: "card", status: "extra_check" })).toContain("доп. проверку")
    for (const status of ["rejected", "code_requested", "extra_check", "pending"]) {
      const text = reviewFeedback({ kind: "card", id: 7 }, { type: "card", status })
      for (const fragment of forbidden) expect(text).not.toContain(fragment)
    }
  })

  it("reports real referral decisions", () => {
    expect(reviewFeedback({ kind: "referral", id: 7 }, { type: "referral", status: "approved" })).toBe("Приглашение подтверждено.")
    expect(reviewFeedback({ kind: "referral", id: 7 }, { type: "referral", status: "rejected" })).toBe("Приглашение отклонено.")
  })
})
