import { isAdmin } from "@/lib/admin-auth"
import { getAdminCounts } from "@/lib/admin-counts"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await isAdmin())) return new Response("Forbidden", { status: 403 })
  return Response.json(await getAdminCounts(), { headers: { "Cache-Control": "no-store" } })
}
