import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { referralCode } from "@/lib/db/schema"
import { createReferralCookie, readReferralCookie, REFERRAL_COOKIE, REFERRAL_TTL } from "@/lib/referrals"

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers })
  // Relative redirects preserve the public origin behind the preview proxy.
  const response = new NextResponse(null, { status: 303, headers: { Location: session?.user ? "/cabinet" : "/sign-up", "Cache-Control": "no-store" } })
  if (session?.user) return response
  const { code } = await params
  if (!/^[a-f0-9]{24}$/.test(code)) return response
  const [owner] = await db.select({ userId: referralCode.userId }).from(referralCode).where(eq(referralCode.code, code))
  if (!owner) return response
  const existing = request.cookies.get(REFERRAL_COOKIE)?.value
  if (existing && readReferralCookie(existing)) return response
  response.cookies.set(REFERRAL_COOKIE, createReferralCookie(code), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "development" || request.nextUrl.protocol === "https:",
    sameSite: process.env.NODE_ENV === "development" ? "none" : "lax",
    maxAge: REFERRAL_TTL,
    path: "/",
  })
  return response
}
