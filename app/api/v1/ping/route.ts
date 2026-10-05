import { webhookUrl } from "@/lib/card-webhook"
import { noStore, operatorAuthError } from "@/lib/operator-api"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const denied = operatorAuthError(request)
  if (denied) return denied
  return Response.json(
    { ok: true, version: "v1", webhookConfigured: Boolean(await webhookUrl()), serverTime: new Date().toISOString() },
    { headers: noStore },
  )
}
