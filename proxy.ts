import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"
import { CANONICAL_ORIGIN, isForeignDeployment } from "@/lib/deployment-guard"

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (isForeignDeployment()) {
    return NextResponse.redirect(new URL(pathname + search, CANONICAL_ORIGIN), 308)
  }
  // Signed-in players land on the games hall; the marketing page is for guests.
  if (pathname === "/" && getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/play", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
