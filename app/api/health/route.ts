import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/** Liveness + database check for Docker healthchecks, Caddy and uptime monitors. */
export async function GET() {
  const startedAt = Date.now()
  try {
    await db.execute(sql`select 1`)
    return NextResponse.json(
      {
        ok: true,
        db: "up",
        latencyMs: Date.now() - startedAt,
        uptimeSec: Math.round(process.uptime()),
        version: process.env.APP_VERSION ?? null,
      },
      { headers: { "cache-control": "no-store" } },
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, db: "down", error: error instanceof Error ? error.message : "unknown" },
      { status: 503, headers: { "cache-control": "no-store" } },
    )
  }
}
