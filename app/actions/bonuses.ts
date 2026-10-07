"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { isUniqueViolation, lockUser } from "@/lib/db/ledger"
import { bonusClaim, transaction } from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { bonusCode, getBonusOverview, type BonusId, type BonusOverview } from "@/lib/bonuses"
import { formatByn, notify } from "@/lib/notifications"
import { publish, topics } from "@/lib/realtime"
import { logActivity } from "@/lib/visitors"

const CLAIMABLE: Exclude<BonusId, "welcome">[] = ["card", "first_deposit", "reload"]

const LABEL: Record<Exclude<BonusId, "welcome">, string> = {
  card: "Бонус за привязку карты",
  first_deposit: "Бонус на первый депозит",
  reload: "Недельный релоад",
}

export async function getBonuses(): Promise<BonusOverview> {
  const user = await getSessionUser()
  return getBonusOverview(db, user.id)
}

class BonusError extends Error {}

export async function claimBonus(rawId: string): Promise<{ ok: true; amount: number } | { ok: false; error: string }> {
  const user = await getSessionUser()
  const id = CLAIMABLE.find((b) => b === rawId)
  if (!id) return { ok: false, error: "Неизвестный бонус" }
  if (!(await allowUserAction(user.id, "bonus"))) return { ok: false, error: RATE_LIMIT_ERROR }

  let amount: number
  try {
    amount = await db.transaction(async (tx) => {
      await lockUser(tx, user.id)
      const state = (await getBonusOverview(tx, user.id))[id]
      if (state.status === "claimed") throw new BonusError("Бонус уже получен")
      if (state.status !== "claimable") throw new BonusError(state.hint)

      await tx.insert(bonusClaim).values({ userId: user.id, code: bonusCode(id), amount: state.amount })
      await tx.insert(transaction).values({ userId: user.id, type: "bonus", amount: state.amount, description: LABEL[id] })
      await notify(tx, user.id, {
        kind: "bonus",
        title: `${LABEL[id]}: +${formatByn(state.amount)}`,
        body: "Бонус зачислен на игровой баланс. Удачной игры!",
        href: "/play",
      })
      return state.amount
    })
  } catch (error) {
    if (error instanceof BonusError) return { ok: false, error: error.message }
    if (isUniqueViolation(error)) return { ok: false, error: "Бонус уже получен" }
    throw error
  }

  await logActivity("bonus", `${LABEL[id]}: ${formatByn(amount)}`)
  await publish(topics.userBalance(user.id))
  revalidatePath("/cabinet", "layout")
  revalidatePath("/play", "layout")
  return { ok: true, amount }
}
