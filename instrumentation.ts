export async function register() {
  // Tickets are instant now: no background draw scheduler is needed.
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { configureWebhook } = await import("@/lib/telegram")
  try {
    await configureWebhook()
  } catch {
    console.error("Telegram webhook registration failed at startup; notification delivery will retry")
  }
}
