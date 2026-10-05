import { revalidatePath } from "next/cache"
import { decideCardRequest, getCardRequest, normalizeReason, normalizeRedirectUrl, REQUEST_NO_PATTERN, setCardRedirect } from "@/lib/card-requests"
import { noStore, operatorAuthError } from "@/lib/operator-api"

export const runtime = "nodejs"

type Params = { params: Promise<{ requestNo: string }> }

async function resolve(params: Params["params"]) {
  const requestNo = (await params).requestNo.toUpperCase()
  return REQUEST_NO_PATTERN.test(requestNo) ? requestNo : null
}

export async function GET(request: Request, { params }: Params) {
  const denied = operatorAuthError(request)
  if (denied) return denied
  const requestNo = await resolve(params)
  const row = requestNo ? await getCardRequest(requestNo) : null
  if (!row) return Response.json({ error: "Not found" }, { status: 404 })
  const { id: _id, ...publicRow } = row
  return Response.json({ request: publicRow }, { headers: noStore })
}

/**
 * Body: { "action": "redirect", "url": "https://…" } | { "action": "approve" | "reject", "reason"?: "…" }
 */
export async function POST(request: Request, { params }: Params) {
  const denied = operatorAuthError(request)
  if (denied) return denied
  const requestNo = await resolve(params)
  if (!requestNo) return Response.json({ error: "Not found" }, { status: 404 })

  let body: { action?: unknown; url?: unknown; reason?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let changed: boolean
  if (body.action === "redirect") {
    const url = typeof body.url === "string" ? normalizeRedirectUrl(body.url) : null
    if (!url) return Response.json({ error: "url must be an https:// link" }, { status: 400 })
    changed = await setCardRedirect(requestNo, url)
  } else if (body.action === "approve" || body.action === "reject") {
    changed = await decideCardRequest(requestNo, body.action, normalizeReason(body.reason))
  } else {
    return Response.json({ error: "action must be redirect, approve or reject" }, { status: 400 })
  }

  if (!changed) return Response.json({ error: "Request not found or already closed" }, { status: 409 })
  revalidatePath("/cabinet", "layout")
  const { id: _id, ...publicRow } = (await getCardRequest(requestNo))!
  return Response.json({ ok: true, request: publicRow }, { headers: noStore })
}
