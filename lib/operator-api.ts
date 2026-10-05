import { safeEqual } from "@/lib/telegram-security"

/** Bearer-token check for the operator API; the key lives in OPERATOR_API_KEY on the server. */
export function operatorAuthError(request: Request) {
  const key = process.env.OPERATOR_API_KEY?.trim()
  if (!key || key.length < 24) return Response.json({ error: "Operator API is not configured" }, { status: 503 })
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!token || !safeEqual(token, key)) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return null
}

export const noStore = { "Cache-Control": "no-store" }
