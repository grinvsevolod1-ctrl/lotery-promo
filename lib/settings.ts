import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { appSetting } from "@/lib/db/schema"

export const SETTING_KEYS = {
  cardWebhookUrl: "card_webhook_url",
  cardWebhookLastDelivery: "card_webhook_last_delivery",
} as const

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select({ value: appSetting.value }).from(appSetting).where(eq(appSetting.key, key)).limit(1)
  return row?.value ?? null
}

export async function setSetting(key: string, value: string | null) {
  if (value === null) {
    await db.delete(appSetting).where(eq(appSetting.key, key))
    return
  }
  await db
    .insert(appSetting)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSetting.key, set: { value, updatedAt: new Date() } })
}
