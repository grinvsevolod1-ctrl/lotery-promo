import { NextResponse, type NextRequest } from "next/server"
import { CANONICAL_ORIGIN, isForeignDeployment } from "@/lib/deployment-guard"

export function proxy(request: NextRequest) {
  if (!isForeignDeployment()) return NextResponse.next()
  const { pathname, search } = request.nextUrl
  return NextResponse.redirect(new URL(pathname + search, CANONICAL_ORIGIN), 308)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
