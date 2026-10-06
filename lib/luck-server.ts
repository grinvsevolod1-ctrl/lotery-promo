import { normalizeLuck } from "@/lib/luck"
import { SETTING_KEYS, getSettingRow } from "@/lib/settings"

export async function getLuckState(): Promise<{ attempts: number; updatedAt: Date | null }> {
  const row = await getSettingRow(SETTING_KEYS.luckLevel).catch((error) => {
    console.error("[luck] failed to read luck level", error)
    return null
  })
  return { attempts: normalizeLuck(Number(row?.value)), updatedAt: row?.updatedAt ?? null }
}

/** Attempts per round for new games; 1 means the boost is off. */
export async function getLuckAttempts(): Promise<number> {
  return (await getLuckState()).attempts
}
