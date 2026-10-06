import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

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

export async function recordVisit(input: { ip: string; userAgent: string; path: string; userId: string | null }) {
  const userAgent = input.userAgent.slice(0, 400)
  const device = parseUserAgent(userAgent)
  await db.execute(sql`
    insert into visitor ("ip", "userAgent", "deviceType", "os", "browser", "userId", "lastPath")
    values (${input.ip}, ${userAgent}, ${device.deviceType}, ${device.os}, ${device.browser}, ${input.userId}, ${input.path})
    on conflict ("ip", "userAgent") do update set
      "hits" = visitor."hits" + 1,
      "lastSeenAt" = now(),
      "lastPath" = excluded."lastPath",
      "userId" = coalesce(excluded."userId", visitor."userId")
  `)
}
