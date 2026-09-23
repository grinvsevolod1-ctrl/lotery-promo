import "server-only"

import crypto from "node:crypto"
import { cookies, headers } from "next/headers"
import { and, eq, gt, lt } from "drizzle-orm"
import { db } from "@/lib/db"
import { appSession, appUser, type AppUser } from "@/lib/db/schema"

const SESSION_COOKIE = "lb_session"
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 дней

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/** Создаёт сессию для пользователя и ставит httpOnly-cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex")
  const id = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  const h = await headers()
  await db.insert(appSession).values({
    id,
    userId,
    expiresAt,
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

/** Текущий залогиненный пользователь лотереи или null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const id = hashToken(token)
  const rows = await db
    .select({ user: appUser, expiresAt: appSession.expiresAt })
    .from(appSession)
    .innerJoin(appUser, eq(appSession.userId, appUser.id))
    .where(and(eq(appSession.id, id), gt(appSession.expiresAt, new Date())))
    .limit(1)

  const row = rows[0]
  if (!row) return null
  if (row.user.isBlocked) return null
  return row.user
}

/** Удаляет текущую сессию пользователя. */
export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.delete(appSession).where(eq(appSession.id, hashToken(token)))
    store.delete(SESSION_COOKIE)
  }
}

/** Чистка протухших сессий (best-effort, вызывается фоново). */
export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(appSession).where(lt(appSession.expiresAt, new Date()))
}
