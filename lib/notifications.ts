import { and, count, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import type { Tx } from "@/lib/db/ledger"
import { notification } from "@/lib/db/schema"
import { publish, topics } from "@/lib/realtime"

export type NotificationKind = "money" | "card" | "bonus" | "win" | "system"

export type NewNotification = {
  kind: NotificationKind
  title: string
  body: string
  href?: string | null
}

/**
 * Writes an inbox entry. Pass the surrounding transaction so the message
 * only appears when the money movement it describes is committed.
 */
export async function notify(executor: Tx | typeof db, userId: string, entry: NewNotification) {
  await executor.insert(notification).values({ userId, ...entry, href: entry.href ?? null })
}

/** Fire-and-forget variant for code paths outside a transaction; never breaks the caller. */
export async function notifySafe(userId: string, entry: NewNotification) {
  try {
    await notify(db, userId, entry)
    await publish(topics.userBalance(userId))
  } catch (error) {
    console.error("notification insert failed", error)
  }
}

export async function unreadCount(userId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)))
  return Number(row?.total ?? 0)
}

export function formatByn(amount: number) {
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} BYN`
}
