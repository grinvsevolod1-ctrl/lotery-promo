import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("@/lib/db", () => ({ db: {} }))
vi.mock("@/lib/telegram", () => ({ notifyTelegram: vi.fn() }))
import { createReferralCookie, readReferralCookie, REFERRAL_TTL } from "@/lib/referrals"

beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-referral-secret")
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-04T12:00:00Z"))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

describe("referral attribution cookies", () => {
  const code = "a".repeat(24)
  it("validates a signed invitation", () => {
    expect(readReferralCookie(createReferralCookie(code))).toBe(code)
  })
  it("rejects tampering, invalid codes and expired cookies", () => {
    const cookie = createReferralCookie(code)
    expect(readReferralCookie(cookie.replace(code, "b".repeat(24)))).toBeNull()
    expect(readReferralCookie("invalid.cookie")).toBeNull()
    vi.advanceTimersByTime((REFERRAL_TTL + 1) * 1000)
    expect(readReferralCookie(cookie)).toBeNull()
  })
  it("rejects cross-secret reuse", () => {
    const cookie = createReferralCookie(code)
    vi.stubEnv("BETTER_AUTH_SECRET", "different-secret")
    expect(readReferralCookie(cookie)).toBeNull()
  })
})
