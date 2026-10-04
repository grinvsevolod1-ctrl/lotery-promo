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
