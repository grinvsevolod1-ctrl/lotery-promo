import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { callbackData, isPrivateAdmin, parseCallback, safeEqual, webhookSecret } from "@/lib/telegram-security"
import { parseAdminIds } from "@/lib/telegram-config"

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
  it("allows only configured private-chat admins", () => {
    const admins = ["123456", "777777"]
    expect(isPrivateAdmin({ id: 123456, type: "private" }, 123456, admins)).toBe(true)
    expect(isPrivateAdmin({ id: 777777, type: "private" }, 777777, admins)).toBe(true)
    expect(isPrivateAdmin({ id: 123456, type: "private" }, 777777, admins)).toBe(false)
    expect(isPrivateAdmin({ id: 654321, type: "private" }, 654321, admins)).toBe(false)
    expect(isPrivateAdmin({ id: 123456, type: "group" }, 123456, admins)).toBe(false)
    expect(isPrivateAdmin({ id: -123456, type: "supergroup" }, 123456, admins)).toBe(false)
    expect(isPrivateAdmin(undefined, undefined, admins)).toBe(false)
    expect(isPrivateAdmin({ id: 123456, type: "private" }, 123456, [])).toBe(false)
  })
  it("derives a stable header secret per token and uses timing-safe comparisons", () => {
    expect(webhookSecret("unit-test-bot-token")).toMatch(/^[a-f0-9]{64}$/)
    expect(webhookSecret("changed-token")).not.toBe(webhookSecret("unit-test-bot-token"))
    expect(webhookSecret(null)).toBeNull()
    expect(safeEqual("test", "test")).toBe(true)
    expect(safeEqual("test", "other")).toBe(false)
  })
  it("parses up to three unique admin ids from admin settings or legacy env", () => {
    expect(parseAdminIds('["123456","777777"]')).toEqual(["123456", "777777"])
    expect(parseAdminIds("123456, 777777 888888;999999")).toEqual(["123456", "777777", "888888"])
    expect(parseAdminIds("123456,123456,abc,-100500")).toEqual(["123456"])
    expect(parseAdminIds(null)).toEqual([])
  })
})
