"use server"

import { and, asc, desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { paymentCard } from "@/lib/db/schema"
import type { CardBrand } from "@/lib/payment-cards"

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

type CardsResult = { ok: true; cards: PaymentCardView[] }

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

async function listCards(userId: string): Promise<PaymentCardView[]> {
  const rows = await db.select().from(paymentCard)
    .where(and(eq(paymentCard.userId, userId), sql`${paymentCard.bankName} is distinct from ${"Тестовая карта (не банк)"}`))
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

export async function setDefaultPaymentCard(id: number): Promise<PaymentCardView[]> {
  const userId = await getUserId()
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid card")
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
    const [owned] = await tx.select({ id: paymentCard.id }).from(paymentCard)
      .where(and(eq(paymentCard.id, id), eq(paymentCard.userId, userId)))
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
        .where(eq(paymentCard.userId, userId)).orderBy(asc(paymentCard.createdAt)).limit(1)
      if (next) await tx.update(paymentCard).set({ isDefault: true })
        .where(and(eq(paymentCard.id, next.id), eq(paymentCard.userId, userId)))
    }
  })
  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(userId) }
}
