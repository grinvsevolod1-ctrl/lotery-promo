import type { Instrumentation } from "next"

export async function register() {
  // The VPS runs one long-lived Node server, so a timer can sweep crypto invoices
  // even when the user closed the payment screen. Serverless hosts skip it.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL) return
  if (!process.env.DATABASE_URL) return

  const { checkPendingInvoices } = await import("@/lib/crypto/deposits")
  let running = false
  setInterval(() => {
    if (running) return
    running = true
    checkPendingInvoices()
      .catch((error) => console.error(JSON.stringify({ level: "error", event: "crypto_scan_failed", message: String(error) })))
      .finally(() => {
        running = false
      })
  }, 45_000).unref()
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
