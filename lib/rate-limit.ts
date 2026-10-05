import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

/**
 * Fixed-window limiter backed by Postgres, so the counter is shared by every
 * server instance (Vercel functions, PM2 cluster, Docker replicas). One atomic
 * upsert per call: the window resets once it has expired.
 * Returns true when the call is allowed.
 */
export async function consumeRateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const result = await db.execute<{ count: number }>(sql`
    insert into app_rate_limit (key, count, "windowStart")
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case
        when app_rate_limit."windowStart" < now() - make_interval(secs => ${windowSec}) then 1
        else app_rate_limit.count + 1
      end,
      "windowStart" = case
        when app_rate_limit."windowStart" < now() - make_interval(secs => ${windowSec}) then now()
        else app_rate_limit."windowStart"
      end
    returning count
  `)
  return Number(result.rows[0]?.count ?? 0) <= max
}

export const RATE_LIMIT_ERROR = "Слишком много запросов. Подождите минуту и попробуйте снова."

/** Per-user limits for actions that touch money or the admin queue. */
export const LIMITS = {
  buyTicket: { max: 30, windowSec: 60 },
  spin: { max: 10, windowSec: 60 },
  welcome: { max: 5, windowSec: 60 },
  cardBinding: { max: 5, windowSec: 600 },
  cardReply: { max: 10, windowSec: 600 },
  cardManage: { max: 30, windowSec: 60 },
} as const

export async function allowUserAction(userId: string, action: keyof typeof LIMITS) {
  const { max, windowSec } = LIMITS[action]
  return consumeRateLimit(`user:${userId}:${action}`, max, windowSec)
}
