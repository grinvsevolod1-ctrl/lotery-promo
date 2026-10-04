import { auth } from "@/lib/auth"
import { getFundingRequests } from "@/app/actions/funding"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return Response.json(await getFundingRequests(), { headers: { "Cache-Control": "private, no-store" } })
}
