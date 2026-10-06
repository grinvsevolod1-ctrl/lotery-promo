"use server"

import { and, count, countDistinct, desc, eq, ilike, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user, visitor } from "@/lib/db/schema"
import { isAdmin } from "@/lib/admin-auth"

const DEVICE_FILTERS = ["mobile", "tablet", "desktop", "bot"] as const
export type DeviceFilter = (typeof DEVICE_FILTERS)[number]

export interface VisitorRow {
  id: number
  ip: string
  userAgent: string
  deviceType: string
  os: string
  browser: string
  lastPath: string
  hits: number
  firstSeenAt: string
  lastSeenAt: string
  email: string | null
}

export interface VisitorStats {
  uniqueIps: number
  devices: number
  last24h: number
  totalHits: number
}

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Forbidden")
}

export async function getVisitorStats(): Promise<VisitorStats> {
  await assertAdmin()
  const [row] = await db
    .select({
      uniqueIps: countDistinct(visitor.ip),
      devices: count(),
      totalHits: sql<number>`coalesce(sum(${visitor.hits}), 0)`,
      last24h: sql<number>`count(*) filter (where ${visitor.lastSeenAt} > now() - interval '24 hours')`,
    })
    .from(visitor)
    .where(sql`${visitor.deviceType} <> 'bot'`)
  return {
    uniqueIps: Number(row.uniqueIps),
    devices: Number(row.devices),
    totalHits: Number(row.totalHits),
    last24h: Number(row.last24h),
  }
}

export async function listVisitors(query?: string, device?: string): Promise<VisitorRow[]> {
  await assertAdmin()
  const term = query?.trim().slice(0, 80)
  const conditions = [
    device && (DEVICE_FILTERS as readonly string[]).includes(device)
      ? eq(visitor.deviceType, device)
      : sql`${visitor.deviceType} <> 'bot'`,
    term
      ? or(ilike(visitor.ip, `%${term}%`), ilike(user.email, `%${term}%`), ilike(visitor.browser, `%${term}%`), ilike(visitor.os, `%${term}%`))
      : undefined,
  ]

  const rows = await db
    .select({
      id: visitor.id,
      ip: visitor.ip,
      userAgent: visitor.userAgent,
      deviceType: visitor.deviceType,
      os: visitor.os,
      browser: visitor.browser,
      lastPath: visitor.lastPath,
      hits: visitor.hits,
      firstSeenAt: visitor.firstSeenAt,
      lastSeenAt: visitor.lastSeenAt,
      email: user.email,
    })
    .from(visitor)
    .leftJoin(user, eq(user.id, visitor.userId))
    .where(and(...conditions))
    .orderBy(desc(visitor.lastSeenAt))
    .limit(300)

  return rows.map((row) => ({
    ...row,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  }))
}
