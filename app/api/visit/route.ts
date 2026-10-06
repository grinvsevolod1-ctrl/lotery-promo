import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { consumeRateLimit } from "@/lib/rate-limit"
import { DEVICE_COOKIE, getClientIp, isValidDeviceId, recordVisit, sanitizePath } from "@/lib/visitors"

export const dynamic = "force-dynamic"

const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2

export async function POST(request: Request) {
  const ip = getClientIp(request.headers)
  const userAgent = request.headers.get("user-agent") ?? ""

  if (!(await consumeRateLimit(`visit:${ip}`, 120, 60))) {
    return new NextResponse(null, { status: 204 })
  }

  const cookieValue = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === DEVICE_COOKIE)?.[1]
  const deviceId = isValidDeviceId(cookieValue) ? cookieValue : crypto.randomUUID()

  const body = (await request.json().catch(() => null)) as { path?: unknown } | null
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null)

  try {
    await recordVisit({ ip, userAgent, path: sanitizePath(body?.path), userId: session?.user?.id ?? null, deviceId })
  } catch (error) {
    console.error("[visit] failed to record visit", error)
  }

  const response = new NextResponse(null, { status: 204 })
  response.cookies.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  })
  return response
}
