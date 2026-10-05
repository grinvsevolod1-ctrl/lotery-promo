import { listCardRequests } from "@/lib/card-requests"
import { apiError, noStore, operatorAuthError } from "@/lib/operator-api"

export const runtime = "nodejs"

const STATUSES = new Set(["pending", "code_requested", "extra_check", "confirmed", "rejected"])

export async function GET(request: Request) {
  const denied = operatorAuthError(request)
  if (denied) return denied
  const params = new URL(request.url).searchParams
  const status = params.get("status") ?? undefined
  if (status && !STATUSES.has(status)) return apiError(400, "invalid_status", "Unknown status")
  const limit = Number(params.get("limit") ?? 50) || 50
  const createdAfterRaw = params.get("createdAfter")
  const createdAfter = createdAfterRaw ? new Date(createdAfterRaw) : undefined
  if (createdAfter && Number.isNaN(createdAfter.getTime())) {
    return apiError(400, "invalid_created_after", "createdAfter must be an ISO 8601 date")
  }
  return Response.json({ requests: await listCardRequests(status, limit, createdAfter) }, { headers: noStore })
}
