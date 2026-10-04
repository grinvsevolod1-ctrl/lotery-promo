import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { settleLegacyTickets } from "@/lib/draws"

export const dynamic = "force-dynamic"
// Settlement also sends result e-mails, so give the Vercel function headroom.
export const maxDuration = 60

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * External trigger for draw settlement, e.g. from system cron:
 *   0 20 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/settle
 * Idempotent: settles only draws whose time has passed and that are still scheduled.
 */
async function handle(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 })
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const settled = await settleLegacyTickets()
  return NextResponse.json({ ok: true, settled, at: new Date().toISOString() })
}

export { handle as GET, handle as POST }
