import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { consumeRateLimit } from "@/lib/rate-limit"
import { getClientIp, recordVisit, sanitizePath } from "@/lib/visitors"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const ip = getClientIp(request.headers)
  const userAgent = request.headers.get("user-agent") ?? ""

  if (!(await consumeRateLimit(`visit:${ip}`, 120, 60))) {
    return new NextResponse(null, { status: 204 })
  }

  const body = (await request.json().catch(() => null)) as { path?: unknown } | null
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null)

  try {
    await recordVisit({ ip, userAgent, path: sanitizePath(body?.path), userId: session?.user?.id ?? null })
  } catch (error) {
    console.error("[visit] failed to record visit", error)
  }
  return new NextResponse(null, { status: 204 })
}
