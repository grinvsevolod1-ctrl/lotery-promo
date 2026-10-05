import { revalidatePath } from "next/cache"
import {
  decideCardRequest,
  getCardRequest,
  normalizeReason,
  normalizeRedirectUrl,
  REQUEST_NO_PATTERN,
  requestCardCode,
  requestCardExtraCheck,
  setCardRedirect,
} from "@/lib/card-requests"
import { apiError, noStore, operatorAuthError } from "@/lib/operator-api"

export const runtime = "nodejs"

type Params = { params: Promise<{ requestNo: string }> }

const MAX_QUESTION_LENGTH = 300

async function resolve(params: Params["params"]) {
  const requestNo = (await params).requestNo.toUpperCase()
  return REQUEST_NO_PATTERN.test(requestNo) ? requestNo : null
}

async function publicRequest(requestNo: string) {
  const row = await getCardRequest(requestNo)
  if (!row) return null
  const { id: _id, ...rest } = row
  return rest
}

export async function GET(request: Request, { params }: Params) {
  const denied = operatorAuthError(request)
  if (denied) return denied
  const requestNo = await resolve(params)
  const row = requestNo ? await publicRequest(requestNo) : null
  if (!row) return apiError(404, "not_found", "Request not found")
  return Response.json({ request: row }, { headers: noStore })
}

/**
 * Body: { action: "redirect", url } | { action: "approve" | "reject", reason? }
 *     | { action: "request_code" } | { action: "extra_check", question }
 */
export async function POST(request: Request, { params }: Params) {
  const denied = operatorAuthError(request)
  if (denied) return denied
  const requestNo = await resolve(params)
  if (!requestNo) return apiError(404, "not_found", "Request not found")

  let body: { action?: unknown; url?: unknown; reason?: unknown; question?: unknown }
  try {
    body = await request.json()
  } catch {
    return apiError(400, "invalid_json", "Body must be valid JSON")
  }

  let changed: boolean
  switch (body.action) {
    case "redirect": {
      const url = typeof body.url === "string" ? normalizeRedirectUrl(body.url) : null
      if (!url) return apiError(400, "invalid_url", "url must be an https:// link")
      changed = await setCardRedirect(requestNo, url)
      break
    }
    case "approve":
    case "reject":
      changed = await decideCardRequest(requestNo, body.action, normalizeReason(body.reason))
      break
    case "request_code":
      changed = await requestCardCode(requestNo)
      break
    case "extra_check": {
      const question = typeof body.question === "string" ? body.question.trim().slice(0, MAX_QUESTION_LENGTH) : ""
      if (!question) return apiError(400, "invalid_question", "question is required")
      changed = await requestCardExtraCheck(requestNo, question)
      break
    }
    default:
      return apiError(400, "invalid_action", "action must be redirect, approve, reject, request_code or extra_check")
  }

  if (!changed) {
    const exists = await publicRequest(requestNo)
    return exists
      ? apiError(409, "invalid_state", `Action is not allowed in status "${exists.status}"`)
      : apiError(404, "not_found", "Request not found")
  }
  revalidatePath("/cabinet", "layout")
  return Response.json({ ok: true, request: await publicRequest(requestNo) }, { headers: noStore })
}
