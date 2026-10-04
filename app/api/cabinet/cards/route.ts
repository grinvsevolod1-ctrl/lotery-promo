import { auth } from "@/lib/auth"
import { getPaymentCards } from "@/app/actions/cards"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return Response.json(await getPaymentCards(), { headers: { "Cache-Control": "private, no-store" } })
}
