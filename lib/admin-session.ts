import "server-only"

import crypto from "node:crypto"
import { cookies, headers } from "next/headers"
import { and, eq, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { appSession } from "@/lib/db/schema"

// Оператор (staff) входит по логину/паролю из переменных окружения:
//   ADMIN_USERNAME, ADMIN_PASSWORD
// Сессия оператора хранится в той же таблице app_session с userId='env-admin'
// и отдельной cookie — у оператора нет записи в app_user.
const ADMIN_COOKIE = "lb_admin"
const ADMIN_SUBJECT = "env-admin"
const ADMIN_TTL_MS = 1000 * 60 * 60 * 12 // 12 часов

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export function adminCredentialsConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD)
}

/** Проверяет логин/пароль оператора против переменных окружения. */
export function verifyAdminCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME
  const p = process.env.ADMIN_PASSWORD
  if (!u || !p) return false
  return safeEqual(username.trim(), u) && safeEqual(password, p)
}

/** Создаёт сессию оператора и ставит httpOnly-cookie. */
export async function createAdminSession(): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex")
  const id = hashToken(token)
  const expiresAt = new Date(Date.now() + ADMIN_TTL_MS)

  const h = await headers()
  await db.insert(appSession).values({
    id,
    userId: ADMIN_SUBJECT,
    expiresAt,
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  })

  const store = await cookies()
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

/** true, если запрос сделан авторизованным оператором. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  if (!token) return false

  const rows = await db
    .select({ id: appSession.id })
    .from(appSession)
    .where(
      and(
        eq(appSession.id, hashToken(token)),
        eq(appSession.userId, ADMIN_SUBJECT),
        gt(appSession.expiresAt, new Date()),
      ),
    )
    .limit(1)

  return rows.length > 0
}

/** Завершает сессию оператора. */
export async function destroyAdminSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  if (token) {
    await db.delete(appSession).where(eq(appSession.id, hashToken(token)))
    store.delete(ADMIN_COOKIE)
  }
}
