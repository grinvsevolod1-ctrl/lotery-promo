import type { Instrumentation } from "next"

export async function register() {
  // Tickets are instant now: no background draw scheduler is needed.
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // On Vercel every cold start would re-register the webhook; there it is
  // registered lazily, once per instance, before the first notification.
  if (process.env.VERCEL) return
  const { configureWebhook } = await import("@/lib/telegram")
  try {
    await configureWebhook()
  } catch {
    console.error("Telegram webhook registration failed at startup; notification delivery will retry")
  }
}

// Structured server error log: picked up by Vercel/PM2/docker log drains, so
// failures in production are visible without an external SDK.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as Error & { digest?: string }
  console.error(
    JSON.stringify({
      level: "error",
      event: "request_error",
      message: err?.message,
      digest: err?.digest,
      stack: err?.stack?.split("\n").slice(0, 8).join("\n"),
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      at: new Date().toISOString(),
    }),
  )
}
