import { cookies, headers } from "next/headers"
import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user, visitor, visitorEvent } from "@/lib/db/schema"

import { publish, topics } from "@/lib/realtime"

export type DeviceType = "mobile" | "tablet" | "desktop" | "bot"

export interface ParsedDevice {
  deviceType: DeviceType
  os: string
  browser: string
}

const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|monitor|curl|wget|python-requests/i

export function parseUserAgent(ua: string): ParsedDevice {
  if (!ua) return { deviceType: "bot", os: "Неизвестно", browser: "Неизвестно" }
  if (BOT_PATTERN.test(ua)) return { deviceType: "bot", os: "—", browser: "Бот" }

  let os = "Неизвестно"
  if (/iPhone|iPad|iPod/.test(ua)) os = `iOS ${(ua.match(/OS (\d+)[_\d]*/) ?? [])[1] ?? ""}`.trim()
  else if (/Android/.test(ua)) os = `Android ${(ua.match(/Android (\d+)/) ?? [])[1] ?? ""}`.trim()
  else if (/Windows NT/.test(ua)) os = "Windows"
  else if (/Mac OS X/.test(ua)) os = "macOS"
  else if (/CrOS/.test(ua)) os = "ChromeOS"
  else if (/Linux/.test(ua)) os = "Linux"

  let browser = "Другой"
  if (/YaBrowser/.test(ua)) browser = "Яндекс Браузер"
  else if (/SamsungBrowser/.test(ua)) browser = "Samsung Internet"
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera"
  else if (/Edg\//.test(ua)) browser = "Edge"
  else if (/Firefox|FxiOS/.test(ua)) browser = "Firefox"
  else if (/Chrome|CriOS/.test(ua)) browser = "Chrome"
  else if (/Safari/.test(ua)) browser = "Safari"

  let deviceType: DeviceType = "desktop"
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) deviceType = "tablet"
  else if (/Mobile|iPhone|iPod|Android/.test(ua)) deviceType = "mobile"

  return { deviceType, os, browser }
}

/** First hop of x-forwarded-for is the real client when the reverse proxy sets it. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return (forwarded || headers.get("x-real-ip") || "unknown").slice(0, 64)
}

export function sanitizePath(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/")) return "/"
  return path.split("?")[0].slice(0, 200)
}

export const DEVICE_COOKIE = "bt_did"

export type ActivityType =
  | "first_visit"
  | "ip_change"
  | "sign_up"
  | "sign_in"
  | "card_bind"
  | "card_step"
  | "card_delete"
  | "deposit"
  | "withdrawal"
  | "game"
  | "bonus"
  | "support"

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9-]{16,64}$/
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000
const DUPLICATE_EVENT_WINDOW_MS = 15 * 1000

export function isValidDeviceId(value: unknown): value is string {
  return typeof value === "string" && DEVICE_ID_PATTERN.test(value)
}

/** Cookie first; rows created before the cookie existed are matched by IP + browser and adopted. */
async function findVisitor(deviceId: string | undefined, ip: string, userAgent: string) {
  const columns = { id: visitor.id, ip: visitor.ip, userId: visitor.userId }
  if (deviceId) {
    const [byCookie] = await db.select(columns).from(visitor).where(eq(visitor.deviceId, deviceId)).limit(1)
    if (byCookie) return byCookie
  }
  const [legacy] = await db
    .select(columns)
    .from(visitor)
    .where(and(eq(visitor.ip, ip), eq(visitor.userAgent, userAgent), isNull(visitor.deviceId)))
    .limit(1)
  return legacy ?? null
}

/** Skips an event identical to the visitor's latest one made seconds ago (double clicks, retries). */
async function appendEvent(visitorId: number, type: ActivityType, label: string) {
  const [last] = await db
    .select({ type: visitorEvent.type, label: visitorEvent.label, createdAt: visitorEvent.createdAt })
    .from(visitorEvent)
    .where(eq(visitorEvent.visitorId, visitorId))
    .orderBy(desc(visitorEvent.createdAt))
    .limit(1)
  if (last && last.type === type && last.label === label && Date.now() - last.createdAt.getTime() < DUPLICATE_EVENT_WINDOW_MS) return
  await db.insert(visitorEvent).values({ visitorId, type, label: label.slice(0, 300) })
  await publish(topics.adminUsers, visitorId)
}

export async function recordVisit(input: {
  ip: string
  userAgent: string
  path: string
  userId: string | null
  deviceId: string
}) {
  const userAgent = input.userAgent.slice(0, 400)
  const device = parseUserAgent(userAgent)
  const existing = await findVisitor(input.deviceId, input.ip, userAgent)

  if (!existing) {
    const [created] = await db
      .insert(visitor)
      .values({
        deviceId: input.deviceId,
        ip: input.ip,
        userAgent,
        deviceType: device.deviceType,
        os: device.os,
        browser: device.browser,
        userId: input.userId,
        lastPath: input.path,
      })
      .onConflictDoNothing()
      .returning({ id: visitor.id })
    if (created) await appendEvent(created.id, "first_visit", `Первый заход на сайт: ${input.path}`)
    return
  }

  await db
    .update(visitor)
    .set({
      deviceId: input.deviceId,
      ip: input.ip,
      userAgent,
      deviceType: device.deviceType,
      os: device.os,
      browser: device.browser,
      lastPath: input.path,
      hits: sql`${visitor.hits} + 1`,
      lastSeenAt: new Date(),
      userId: input.userId ?? existing.userId,
    })
    .where(eq(visitor.id, existing.id))

  if (existing.ip !== input.ip) {
    await appendEvent(existing.id, "ip_change", `Сменился IP: ${existing.ip} → ${input.ip}`)
  }

  if (input.userId && existing.userId !== input.userId) {
    const [account] = await db
      .select({ email: user.email, createdAt: user.createdAt })
      .from(user)
      .where(eq(user.id, input.userId))
      .limit(1)
    if (account) {
      const isNew = Date.now() - account.createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS
      await appendEvent(
        existing.id,
        isNew ? "sign_up" : "sign_in",
        isNew ? `Зарегистрировал аккаунт ${account.email}` : `Вошёл в аккаунт ${account.email}`,
      )
    }
  }
}

/** Logs an action of the current request's device. Never throws; the action must not fail because of the log. */
export async function logActivity(type: ActivityType, label: string) {
  try {
    const [cookieStore, headerList] = await Promise.all([cookies(), headers()])
    const cookieValue = cookieStore.get(DEVICE_COOKIE)?.value
    const found = await findVisitor(
      isValidDeviceId(cookieValue) ? cookieValue : undefined,
      getClientIp(headerList),
      (headerList.get("user-agent") ?? "").slice(0, 400),
    )
    if (found) await appendEvent(found.id, type, label)
  } catch (error) {
    console.error("[visit] failed to log activity", error)
  }
}
