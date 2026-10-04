import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { callbackData, isPrivateAdmin, parseCallback, safeEqual, webhookSecret } from "@/lib/telegram-security"

beforeEach(() => {
  vi.stubEnv("ADMIN_SECRET", "unit-test-admin-secret")
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "unit-test-bot-token")
  vi.stubEnv("TELEGRAM_CHAT_ID", "123456")
})
afterEach(() => vi.unstubAllEnvs())

describe("Telegram reviews", () => {
  it("round-trips every signed review, within Telegram's byte limit", () => {
    for (const kind of ["card", "funding", "referral"] as const) {
      for (const decision of ["approve", "reject", "code", "extra", "checkout"] as const) {
        const data = callbackData({ kind, id: 2147483647 }, decision)
        expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64)
        expect(parseCallback(data)).toEqual({ kind, id: 2147483647, decision })
      }
    }
  })
  it("rejects tampered decisions and ids", () => {
    const data = callbackData({ kind: "funding", id: 1 }, "approve")
    expect(parseCallback(data.replace(":1:", ":2:"))).toBeNull()
    expect(parseCallback(data.replace("approve", "reject"))).toBeNull()
    expect(parseCallback("garbage")).toBeNull()
  })
  it("allows only the configured private-chat admin", () => {
    expect(isPrivateAdmin({ id: 123456, type: "private" }, 123456)).toBe(true)
    expect(isPrivateAdmin({ id: 123456, type: "private" }, 654321)).toBe(false)
    expect(isPrivateAdmin({ id: 123456, type: "group" }, 123456)).toBe(false)
    expect(isPrivateAdmin({ id: -123456, type: "supergroup" }, 123456)).toBe(false)
    expect(isPrivateAdmin(undefined, undefined)).toBe(false)
  })
  it("derives a stable header secret and uses timing-safe comparisons", () => {
    expect(webhookSecret()).toMatch(/^[a-f0-9]{64}$/)
    expect(safeEqual("test", "test")).toBe(true)
    expect(safeEqual("test", "other")).toBe(false)
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "changed-token")
    expect(webhookSecret()).not.toBeNull()
  })
})
