import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { callbackData, webhookSecret } from "@/lib/telegram-security"

const mocks = vi.hoisted(() => ({ processReview: vi.fn(), getReviewResult: vi.fn(), telegramRequest: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/reviews", () => ({ processReview: mocks.processReview, getReviewResult: mocks.getReviewResult }))
vi.mock("@/lib/telegram", () => ({ telegramRequest: mocks.telegramRequest }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
// The flow modules import "server-only" and the database; the webhook test only exercises routing.
vi.mock("@/lib/verification-flow", () => ({
  decideVerification: vi.fn(async () => true),
  isVerificationDecision: (v: string) => ["codeok", "codebad", "nomsi", "extra", "approve", "reject"].includes(v),
  verificationFeedback: () => "ok",
}))
vi.mock("@/lib/jobs-flow", () => ({
  decideJobApplication: vi.fn(async () => true),
  isJobDecision: (v: string) => ["codeok", "codebad", "nomsi", "extra", "approve", "reject"].includes(v),
  jobFeedback: () => "ok",
}))
vi.mock("@/lib/vault-files", () => ({
  hasVaultAttachment: () => false,
  captureTelegramFile: vi.fn(async () => null),
}))
vi.mock("@/lib/card-requests", () => ({
  decideCardRequest: vi.fn(async () => true),
  findRequestNo: () => null,
  normalizeRedirectUrl: (u: string) => u,
  setCardRedirect: vi.fn(async () => true),
}))
vi.mock("@/lib/telegram-config", () => ({
  getTelegramConfig: async () => ({ token: "test-bot-token", adminIds: ["123", "456"], tokenSource: "admin", adminIdsSource: "admin" }),
}))
import { POST } from "@/app/api/telegram/webhook/route"

const SECRET = webhookSecret("test-bot-token")!

function update(data = callbackData({ kind: "referral", id: 7 }, "approve"), fromId = 123) {
  return { callback_query: { id: "cb", data, from: { id: fromId }, message: { message_id: 12, text: "Приглашение #7", chat: { id: fromId, type: "private" } } } }
}
function request(body: unknown, secret = SECRET, contentLength?: string) {
  return new Request("https://example.com/api/telegram/webhook", { method: "POST", headers: { "x-telegram-bot-api-secret-token": secret, ...(contentLength ? { "content-length": contentLength } : {}) }, body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-bot-token")
  vi.stubEnv("ADMIN_SECRET", "test-admin-secret")
  vi.stubEnv("TELEGRAM_CHAT_ID", "123")
  vi.clearAllMocks()
  mocks.processReview.mockResolvedValue(true)
  mocks.getReviewResult.mockResolvedValue({ status: "approved", type: "referral" })
  mocks.telegramRequest.mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllEnvs())

describe("Telegram webhook", () => {
  it("rejects invalid webhook secrets", async () => {
    expect((await POST(request(update(), "invalid"))).status).toBe(401)
    expect(mocks.processReview).not.toHaveBeenCalled()
  })
  it("ignores callbacks from anyone except the configured private admin", async () => {
    expect((await POST(request(update(undefined, 999)))).status).toBe(200)
    expect(mocks.processReview).not.toHaveBeenCalled()
  })
  it("accepts decisions from any configured admin", async () => {
    expect((await POST(request(update(undefined, 456)))).status).toBe(200)
    expect(mocks.processReview).toHaveBeenCalledTimes(1)
  })
  it("ignores tampered signatures", async () => {
    const data = callbackData({ kind: "funding", id: 7 }, "approve").replace(":7:", ":8:")
    await POST(request(update(data)))
    expect(mocks.processReview).not.toHaveBeenCalled()
  })
  it("rejects oversized and malformed updates", async () => {
    expect((await POST(request(update(), undefined, "20000"))).status).toBe(413)
    expect((await POST(request({ data: "x".repeat(20000) }))).status).toBe(413)
    expect((await POST(new Request("https://example.com", { method: "POST", headers: { "x-telegram-bot-api-secret-token": SECRET }, body: "{" }))).status).toBe(400)
  })
  it("records referral approval without any payment link", async () => {
    expect((await POST(request(update()))).status).toBe(200)
    expect(mocks.processReview).toHaveBeenCalledWith({ kind: "referral", id: 7, decision: "approve" }, "approve")
    expect(mocks.telegramRequest).toHaveBeenCalledWith("editMessageText", expect.objectContaining({ message_id: 12, text: expect.stringContaining("Приглашение подтверждено."), reply_markup: { inline_keyboard: [] } }))
    expect(JSON.stringify(mocks.telegramRequest.mock.calls)).not.toContain("/pay/")
  })
  it.each(["code", "extra"] as const)("does not expose the removed %s simulation", async (decision) => {
    mocks.processReview.mockResolvedValue(false)
    await POST(request(update(callbackData({ kind: "card", id: 7 }, decision))))
    expect(mocks.telegramRequest).toHaveBeenCalledTimes(1)
    expect(mocks.telegramRequest).toHaveBeenCalledWith("answerCallbackQuery", expect.objectContaining({ text: expect.stringContaining("недоступно") }))
    expect(mocks.getReviewResult).not.toHaveBeenCalled()
  })
  it("acknowledges an applied decision even if Telegram cannot edit the message", async () => {
    mocks.telegramRequest.mockRejectedValue(new Error("Telegram unavailable"))
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      expect((await POST(request(update()))).status).toBe(200)
      expect(mocks.processReview).toHaveBeenCalledTimes(1)
    } finally { log.mockRestore() }
  })
  it("does not apply a duplicate decision", async () => {
    mocks.processReview.mockResolvedValue(false)
    await POST(request(update()))
    expect(mocks.telegramRequest).toHaveBeenCalledTimes(1)
    expect(mocks.telegramRequest).toHaveBeenCalledWith("answerCallbackQuery", expect.objectContaining({ text: expect.stringContaining("уже применено") }))
  })
  it("requests Telegram retry when the database fails", async () => {
    mocks.processReview.mockRejectedValue(new Error("database unavailable"))
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    expect((await POST(request(update()))).status).toBe(503)
    expect(mocks.telegramRequest).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
