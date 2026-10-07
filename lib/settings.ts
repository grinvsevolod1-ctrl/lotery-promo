import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { appSetting } from "@/lib/db/schema"

export const SETTING_KEYS = {
  cardWebhookUrl: "card_webhook_url",
  cardWebhookLastDelivery: "card_webhook_last_delivery",
  cardWebhookLog: "card_webhook_log",
  cryptoWallets: "crypto_wallets",
  telegramBotToken: "telegram_bot_token",
  telegramAdminIds: "telegram_admin_ids",
} as const

export async function getSetting(key: string): Promise<string | null> {
  return (await getSettingRow(key))?.value ?? null
}

export async function getSettingRow(key: string): Promise<{ value: string; updatedAt: Date } | null> {
  const [row] = await db
    .select({ value: appSetting.value, updatedAt: appSetting.updatedAt })
    .from(appSetting)
    .where(eq(appSetting.key, key))
    .limit(1)
  return row ?? null
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
