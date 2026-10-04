import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { callbackData, webhookSecret } from "@/lib/telegram-security"

const mocks = vi.hoisted(() => ({ processReview: vi.fn(), getReviewResult: vi.fn(), telegramRequest: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/reviews", () => ({ processReview: mocks.processReview, getReviewResult: mocks.getReviewResult }))
vi.mock("@/lib/telegram", () => ({ telegramRequest: mocks.telegramRequest }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/site", () => ({ site: { url: "https://example.com" } }))
import { POST } from "@/app/api/telegram/webhook/route"

function update(data = callbackData({ kind: "funding", id: 7 }, "approve"), fromId = 123) {
  return { callback_query: { id: "cb", data, from: { id: fromId }, message: { message_id: 12, text: "Тестовое пополнение #7", chat: { id: 123, type: "private" } } } }
}
function request(body: unknown, secret = webhookSecret()!, contentLength?: string) {
  return new Request("https://example.com/api/telegram/webhook", { method: "POST", headers: { "x-telegram-bot-api-secret-token": secret, ...(contentLength ? { "content-length": contentLength } : {}) }, body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-bot-token")
  vi.stubEnv("ADMIN_SECRET", "test-admin-secret")
  vi.stubEnv("TELEGRAM_CHAT_ID", "123")
  vi.clearAllMocks()
  mocks.processReview.mockResolvedValue(true)
  mocks.getReviewResult.mockResolvedValue({ status: "awaiting_payment", type: "deposit" })
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
  it("ignores tampered signatures", async () => {
    const data = callbackData({ kind: "funding", id: 7 }, "approve").replace(":7:", ":8:")
    await POST(request(update(data)))
    expect(mocks.processReview).not.toHaveBeenCalled()
  })
  it("rejects oversized and malformed updates", async () => {
    expect((await POST(request(update(), undefined, "20000"))).status).toBe(413)
    expect((await POST(request({ data: "x".repeat(20000) }))).status).toBe(413)
    expect((await POST(new Request("https://example.com", { method: "POST", headers: { "x-telegram-bot-api-secret-token": webhookSecret()! }, body: "{" }))).status).toBe(400)
  })
  it("records approval and edits the original message with the demo link", async () => {
    expect((await POST(request(update()))).status).toBe(200)
    expect(mocks.processReview).toHaveBeenCalledWith({ kind: "funding", id: 7, decision: "approve" }, "approve")
    expect(mocks.telegramRequest).toHaveBeenCalledWith("editMessageText", expect.objectContaining({ message_id: 12, text: expect.stringContaining("https://example.com/pay/demo/7"), reply_markup: { inline_keyboard: [] } }))
  })
  it.each(["code", "extra"] as const)("keeps rejection available during the %s step", async (decision) => {
    mocks.getReviewResult.mockResolvedValue({ status: decision === "code" ? "code_required" : "extra_required", type: "card" })
    await POST(request(update(callbackData({ kind: "card", id: 7 }, decision))))
    expect(mocks.telegramRequest).toHaveBeenCalledWith("editMessageText", expect.objectContaining({
      reply_markup: { inline_keyboard: [[{ text: "Отклонить тестовую привязку", callback_data: callbackData({ kind: "card", id: 7 }, "reject") }]] },
    }))
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
