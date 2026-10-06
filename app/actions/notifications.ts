"use server"

import { and, desc, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { notification } from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"
import { allowUserAction } from "@/lib/rate-limit"
import { notify } from "@/lib/notifications"

export type NotificationRow = {
  id: number
  kind: string
  title: string
  body: string
  href: string | null
  readAt: Date | null
  createdAt: Date
}

/** Latest inbox entries; a brand-new player gets a greeting so the inbox is never empty. */
export async function getNotifications(): Promise<NotificationRow[]> {
  const user = await getSessionUser()
  const load = () =>
    db.select({
      id: notification.id, kind: notification.kind, title: notification.title, body: notification.body,
      href: notification.href, readAt: notification.readAt, createdAt: notification.createdAt,
    }).from(notification)
      .where(eq(notification.userId, user.id))
      .orderBy(desc(notification.createdAt)).limit(60)

  const rows = await load()
  if (rows.length > 0) return rows

  await notify(db, user.id, {
    kind: "system",
    title: "Добро пожаловать в ByToLoto!",
    body: "Здесь появятся зачисления, выводы, статусы карт и новые бонусы. Заберите приветственный бонус — он уже ждёт вас.",
    href: "/cabinet/bonuses",
  })
  return load()
}

export async function markAllNotificationsRead() {
  const user = await getSessionUser()
  if (!(await allowUserAction(user.id, "inbox"))) return
  await db.update(notification).set({ readAt: new Date() })
    .where(and(eq(notification.userId, user.id), isNull(notification.readAt)))
  revalidatePath("/cabinet", "layout")
  revalidatePath("/play", "layout")
}
