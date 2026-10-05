import { listCardRequests } from "@/lib/card-requests"
import { noStore, operatorAuthError } from "@/lib/operator-api"

export const runtime = "nodejs"

const STATUSES = new Set(["pending", "code_requested", "extra_check", "confirmed", "rejected"])

export async function GET(request: Request) {
  const denied = operatorAuthError(request)
  if (denied) return denied
  const params = new URL(request.url).searchParams
  const status = params.get("status") ?? undefined
  if (status && !STATUSES.has(status)) return Response.json({ error: "Unknown status" }, { status: 400 })
  const limit = Number(params.get("limit") ?? 50) || 50
  return Response.json({ requests: await listCardRequests(status, limit) }, { headers: noStore })
}
