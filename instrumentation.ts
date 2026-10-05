import type { Instrumentation } from "next"

export async function register() {
  // Nothing to start: tickets are instant and the Telegram webhook is set manually on the server.
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
