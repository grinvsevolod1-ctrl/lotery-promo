import { describe, expect, it } from "vitest"
import { reviewFeedback } from "@/lib/review-feedback"

describe("Telegram review feedback", () => {
  it("includes an internal owner-only demo link for deposits", () => {
    const text = reviewFeedback({ kind: "funding", id: 7 }, { type: "deposit", status: "awaiting_payment" }, "https://example.com")
    expect(text).toContain("https://example.com/pay/demo/7")
    expect(text).toContain("доступ только владельцу")
  })
  it("never gives a payment link for withdrawals", () => {
    const text = reviewFeedback({ kind: "funding", id: 7 }, { type: "withdrawal", status: "approved" }, "https://example.com")
    expect(text).toContain("Реального перевода денег нет")
    expect(text).not.toContain("/pay/")
  })
  it("reports refunded reservations after rejection", () => {
    expect(reviewFeedback({ kind: "funding", id: 7 }, { type: "withdrawal", status: "rejected" }, "https://example.com")).toContain("резерв возвращён")
  })
  it("distinguishes synthetic card checks and referrals", () => {
    expect(reviewFeedback({ kind: "card", id: 7 }, { type: "card", status: "code_required" }, "https://example.com")).toContain("TEST-123")
    expect(reviewFeedback({ kind: "card", id: 7 }, { type: "card", status: "extra_required" }, "https://example.com")).toContain("без банковских данных")
    expect(reviewFeedback({ kind: "referral", id: 7 }, { type: "referral", status: "approved" }, "https://example.com")).toBe("Приглашение подтверждено.")
  })
})
