import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"
import { CANONICAL_ORIGIN, isForeignDeployment } from "@/lib/deployment-guard"

/** jobs.bytoloto.com serves the /jobs section at its root; everything else on that host goes back to the main site. */
function handleJobsHost(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (pathname === "/") return NextResponse.rewrite(new URL(`/jobs${search}`, request.url))
  if (pathname.startsWith("/apply/")) return NextResponse.rewrite(new URL(`/jobs${pathname}${search}`, request.url))
  const passthrough = pathname.startsWith("/jobs") || pathname.startsWith("/_next") || pathname.startsWith("/api") || /\.[a-z0-9]+$/i.test(pathname)
  if (passthrough) return NextResponse.next()
  return NextResponse.redirect(new URL(pathname + search, CANONICAL_ORIGIN), 308)
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (isForeignDeployment()) {
    return NextResponse.redirect(new URL(pathname + search, CANONICAL_ORIGIN), 308)
  }
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase()
  if (host.startsWith("jobs.")) return handleJobsHost(request)
  // Signed-in players land on the games hall; the marketing page is for guests.
  if (pathname === "/" && getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/play", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
