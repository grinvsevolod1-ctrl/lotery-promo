import { NextResponse } from "next/server"
import { consumeRateLimit } from "@/lib/rate-limit"
import { isGoal } from "@/lib/analytics"
import { getClientIp, logFunnelGoal, sanitizePath } from "@/lib/visitors"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const ip = getClientIp(request.headers)
  if (!(await consumeRateLimit(`funnel:${ip}`, 60, 60))) return new NextResponse(null, { status: 204 })

  const body = (await request.json().catch(() => null)) as { goal?: unknown; path?: unknown; params?: unknown } | null
  if (!body || !isGoal(body.goal)) return new NextResponse(null, { status: 204 })

  const params =
    body.params && typeof body.params === "object"
      ? Object.entries(body.params as Record<string, unknown>)
          .filter(([, v]) => ["string", "number", "boolean"].includes(typeof v))
          .slice(0, 4)
          .map(([k, v]) => `${k.slice(0, 20)}=${String(v).slice(0, 40)}`)
          .join(", ")
      : ""

  await logFunnelGoal(body.goal, sanitizePath(body.path), params)
  return new NextResponse(null, { status: 204 })
}
