"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { bonusOffer, notification, user } from "@/lib/db/schema"
import { isAdmin } from "@/lib/admin-auth"
import { sendAdminMessageEmail } from "@/lib/email"
import { publish, topics } from "@/lib/realtime"
import type { ActionResult } from "@/app/actions/admin-players"
import {
  OFFER_AUDIENCES,
  OFFER_CATEGORIES,
  OFFER_KINDS,
  offerConditions,
  offerHeadline,
  type BonusOfferRow,
} from "@/lib/bonus-offers"

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized")
}

function toRow(row: typeof bonusOffer.$inferSelect): BonusOfferRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind as BonusOfferRow["kind"],
    category: row.category as BonusOfferRow["category"],
    gameTitle: row.gameTitle,
    percent: row.percent,
    amount: row.amount,
    maxBonus: row.maxBonus,
    minDeposit: row.minDeposit,
    freeSpins: row.freeSpins,
    spinValue: row.spinValue,
    wager: row.wager,
    wagerContribution: row.wagerContribution,
    validDays: row.validDays,
    maxWin: row.maxWin,
    audience: row.audience as BonusOfferRow["audience"],
    promoCode: row.promoCode,
    active: row.active,
    sortOrder: row.sortOrder,
  }
}

export async function listBonusOffers(): Promise<BonusOfferRow[]> {
  await assertAdmin()
  const rows = await db.select().from(bonusOffer).orderBy(asc(bonusOffer.sortOrder), asc(bonusOffer.id))
  return rows.map(toRow)
}

/** Public list for the player cabinet: only enabled offers. */
export async function listActiveBonusOffers(): Promise<BonusOfferRow[]> {
  const rows = await db
    .select()
    .from(bonusOffer)
    .where(eq(bonusOffer.active, true))
    .orderBy(asc(bonusOffer.sortOrder), asc(bonusOffer.id))
  return rows.map(toRow)
}

const str = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max)

function num(formData: FormData, key: string, { min = 0, max = 100_000, integer = false } = {}) {
  const raw = str(formData, key, 20).replace(",", ".")
  if (raw === "") return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(key)
  return integer ? Math.round(value) : Math.round(value * 100) / 100
}

const FIELD_LABELS: Record<string, string> = {
  percent: "Процент",
  amount: "Сумма бонуса",
  maxBonus: "Максимальный бонус",
  minDeposit: "Минимальное пополнение",
  freeSpins: "Фриспины",
  spinValue: "Стоимость спина",
  wager: "Вейджер",
  wagerContribution: "Вклад в отыгрыш",
  validDays: "Срок действия",
  maxWin: "Максимальный выигрыш",
  sortOrder: "Порядок",
}

function parseOffer(formData: FormData) {
  const title = str(formData, "title", 120)
  const description = str(formData, "description", 600)
  const kind = str(formData, "kind", 20)
  const category = str(formData, "category", 10)
  const audience = str(formData, "audience", 12)
  if (title.length < 3) throw new Error("Название слишком короткое")
  if (description.length < 5) throw new Error("Добавьте описание")
  if (!(kind in OFFER_KINDS)) throw new Error("Выберите тип бонуса")
  if (!(category in OFFER_CATEGORIES)) throw new Error("Выберите категорию игр")
  if (!(audience in OFFER_AUDIENCES)) throw new Error("Выберите аудиторию")

  const promoRaw = str(formData, "promoCode", 24).toUpperCase()
  if (promoRaw && !/^[A-Z0-9_-]{3,24}$/.test(promoRaw)) throw new Error("Промокод: 3–24 латинских буквы или цифры")

  let numbers
  try {
    numbers = {
      percent: num(formData, "percent", { max: 500, integer: true }),
      amount: num(formData, "amount"),
      maxBonus: num(formData, "maxBonus"),
      minDeposit: num(formData, "minDeposit"),
      freeSpins: num(formData, "freeSpins", { max: 1000, integer: true }),
      spinValue: num(formData, "spinValue", { max: 100 }),
      wager: num(formData, "wager", { max: 100, integer: true }) ?? 0,
      wagerContribution: num(formData, "wagerContribution", { min: 1, max: 100, integer: true }) ?? 100,
      validDays: num(formData, "validDays", { min: 1, max: 365, integer: true }) ?? 7,
      maxWin: num(formData, "maxWin"),
      sortOrder: num(formData, "sortOrder", { max: 10_000, integer: true }) ?? 0,
    }
  } catch (error) {
    throw new Error(`Проверьте поле «${FIELD_LABELS[(error as Error).message] ?? (error as Error).message}»`)
  }

  if ((kind === "free_spins") && !numbers.freeSpins) throw new Error("Укажите количество фриспинов")
  if (numbers.freeSpins && !numbers.spinValue) throw new Error("Укажите стоимость одного спина")
  if ((kind === "deposit_match" || kind === "reload" || kind === "cashback") && !numbers.percent && !numbers.amount)
    throw new Error("Укажите процент или сумму бонуса")

  return {
    title,
    description,
    kind,
    category,
    audience,
    gameTitle: str(formData, "gameTitle", 80) || null,
    promoCode: promoRaw || null,
    active: formData.get("active") === "on",
    ...numbers,
  }
}

function failure(error: unknown): ActionResult {
  const message = (error as Error).message
  if (/bonus_offer_promo_code/.test(message)) return { ok: false, error: "Такой промокод уже используется" }
  return { ok: false, error: message.length < 120 ? message : "Не удалось сохранить бонус" }
}

export async function saveBonusOffer(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  const id = Number(formData.get("id") ?? 0)
  try {
    const values = parseOffer(formData)
    if (id > 0) {
      await db.update(bonusOffer).set({ ...values, updatedAt: new Date() }).where(eq(bonusOffer.id, id))
    } else {
      await db.insert(bonusOffer).values(values)
    }
  } catch (error) {
    return failure(error)
  }
  revalidatePath("/admin/bonuses")
  revalidatePath("/cabinet/bonuses")
  return { ok: true, message: id > 0 ? "Бонус обновлён" : "Бонус создан" }
}

export async function toggleBonusOffer(id: number, active: boolean): Promise<ActionResult> {
  await assertAdmin()
  await db.update(bonusOffer).set({ active, updatedAt: new Date() }).where(eq(bonusOffer.id, id))
  revalidatePath("/admin/bonuses")
  revalidatePath("/cabinet/bonuses")
  return { ok: true, message: active ? "Бонус включён" : "Бонус выключен" }
}

export async function deleteBonusOffer(id: number): Promise<ActionResult> {
  await assertAdmin()
  await db.delete(bonusOffer).where(eq(bonusOffer.id, id))
  revalidatePath("/admin/bonuses")
  revalidatePath("/cabinet/bonuses")
  return { ok: true, message: "Бонус удалён" }
}

/** Sends the offer to every active player as a notification, optionally by e-mail too. */
export async function announceBonusOffer(id: number, sendEmail: boolean): Promise<ActionResult> {
  await assertAdmin()
  const [row] = await db.select().from(bonusOffer).where(eq(bonusOffer.id, id))
  if (!row) return { ok: false, error: "Бонус не найден" }
  if (!row.active) return { ok: false, error: "Сначала включите бонус" }
  const offer = toRow(row)

  const title = `${offer.title}: ${offerHeadline(offer)}`
  const body = [offer.description, offerConditions(offer).join("\n"), offer.promoCode ? `Промокод: ${offer.promoCode}` : ""]
    .filter(Boolean)
    .join("\n\n")
  const href = "/cabinet/bonuses"

  const recipients = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(and(isNull(user.blockedAt), offer.audience === "verified"
      ? sql`exists (select 1 from user_verification v where v."userId" = ${user.id} and v.status = 'approved')`
      : undefined))
  if (recipients.length === 0) return { ok: false, error: "Нет получателей" }

  for (let i = 0; i < recipients.length; i += 500) {
    await db.insert(notification).values(
      recipients.slice(i, i + 500).map((r) => ({ userId: r.id, kind: "bonus" as const, title: title.slice(0, 120), body: body.slice(0, 3000), href })),
    )
  }
  for (const r of recipients) void publish(topics.userBalance(r.id))

  if (sendEmail) {
    after(async () => {
      for (const r of recipients) {
        try {
          await sendAdminMessageEmail({ to: r.email, name: r.name, title, body, cta: { label: "Забрать бонус", url: href } })
        } catch (error) {
          console.error("offer mail failed", r.email, error)
        }
      }
    })
  }
  return { ok: true, message: `Акция отправлена ${recipients.length} игрокам${sendEmail ? " (письма уходят в фоне)" : ""}` }
}
