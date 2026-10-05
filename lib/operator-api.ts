import { safeEqual } from "@/lib/telegram-security"

export const noStore = { "Cache-Control": "no-store" }

export function apiError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: noStore })
}

/** Bearer-token check for the card verification API; the key lives in OPERATOR_API_KEY on the server. */
export function operatorAuthError(request: Request) {
  const key = process.env.OPERATOR_API_KEY?.trim()
  if (!key || key.length < 24) return apiError(503, "not_configured", "API is not configured on the server")
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!token || !safeEqual(token, key)) return apiError(401, "unauthorized", "Missing or invalid API key")
  return null
}
