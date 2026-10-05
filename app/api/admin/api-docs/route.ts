import { isAdmin } from "@/lib/admin-auth"
import { buildApiDocs } from "@/lib/api-docs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 })
  const apiKey = process.env.OPERATOR_API_KEY?.trim()
  if (!apiKey) return new Response("OPERATOR_API_KEY is not configured", { status: 503 })

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "bytoloto.com"
  const proto = request.headers.get("x-forwarded-proto") ?? "https"
  const body = buildApiDocs({ baseUrl: `${proto}://${host}`, apiKey })

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bytoloto-operator-api.md"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  })
}
