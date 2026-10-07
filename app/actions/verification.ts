"use server"

import { and, desc, eq, lt, or, isNull } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { user, userVerification } from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"
import { isAdmin } from "@/lib/admin-auth"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { publish, topics } from "@/lib/realtime"
import { escapeTelegram, notifyTelegram } from "@/lib/telegram"
import {
  announceCode,
  announceEnteredCode,
  decideVerification,
  newVerificationCode,
  type VerificationDecision,
} from "@/lib/verification-flow"
import {
  CODE_LENGTH,
  DOCUMENT_TYPES,
  normalizeVerification,
  validateVerification,
  type DocumentType,
  type VerificationInput,
  type VerificationView,
} from "@/lib/verification"

export type VerificationResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof VerificationInput, string>> }

const RESEND_AFTER_MS = 60_000

function toView(row: typeof userVerification.$inferSelect): VerificationView {
  return {
    status: row.status as VerificationView["status"],
    lastName: row.lastName,
    firstName: row.firstName,
    middleName: row.middleName ?? "",
    birthDate: row.birthDate,
    citizenship: row.citizenship,
    documentType: row.documentType,
    documentNumber: row.documentNumber,
    personalNumber: row.personalNumber,
    phone: row.phone,
    address: row.address,
    note: row.note,
    submittedAt: row.submittedAt,
    reviewedAt: row.reviewedAt,
    stage: row.stage,
    testCode: null,
  }
}

export async function getMyVerification(userId: string): Promise<VerificationView | null> {
  const [row] = await db.select().from(userVerification).where(eq(userVerification.userId, userId)).limit(1)
  return row ? toView(row) : null
}

/** Polled by the verification screen so operator decisions appear without a reload. */
export async function getMyVerificationState(): Promise<VerificationView | null> {
  const current = await getSessionUser()
  return getMyVerification(current.id)
}

function refreshPlayer(userId: string) {
  revalidatePath("/cabinet", "layout")
  return Promise.all([publish(topics.adminVerification), publish(topics.adminCounts), publish(topics.userVerification(userId))])
}

export async function submitVerification(raw: Partial<Record<keyof VerificationInput, unknown>>): Promise<VerificationResult> {
  const current = await getSessionUser()
  const input = normalizeVerification(raw)
  const fieldErrors = validateVerification(input)
  if (Object.keys(fieldErrors).length > 0) return { ok: false, error: "Проверьте выделенные поля.", fieldErrors }
  if (!(await allowUserAction(current.id, "verification"))) return { ok: false, error: RATE_LIMIT_ERROR }

  const now = new Date()
  const values = {
    ...input,
    middleName: input.middleName || null,
    status: "code",
    code: newVerificationCode(),
    enteredCode: null,
    stage: 0,
    codeSentAt: now,
    note: null,
    submittedAt: now,
    reviewedAt: null,
  }
  // Only a new or rejected application can be (re)submitted; one in progress or approved is locked.
  const [saved] = await db
    .insert(userVerification)
    .values({ userId: current.id, ...values })
    .onConflictDoUpdate({ target: userVerification.userId, set: values, setWhere: eq(userVerification.status, "rejected") })
    .returning({ id: userVerification.id })
  if (!saved) return { ok: false, error: "Заявка уже на проверке или подтверждена." }

  await refreshPlayer(current.id)
  void notifyTelegram(
    [
      `<b>Заявка на верификацию</b> · #${saved.id}`,
      `Игрок: ${escapeTelegram(current.name)} (${escapeTelegram(current.email)})`,
      `ФИО: ${escapeTelegram([input.lastName, input.firstName, input.middleName].filter(Boolean).join(" "))}`,
      `Дата рождения: ${escapeTelegram(input.birthDate)}`,
      `Гражданство: ${escapeTelegram(input.citizenship)}`,
      `Документ: ${escapeTelegram(DOCUMENT_TYPES[input.documentType as DocumentType])}`,
      `Номер документа: ${escapeTelegram(input.documentNumber)}`,
      `Идентификационный номер: ${escapeTelegram(input.personalNumber)}`,
      `Телефон: ${escapeTelegram(input.phone)}`,
      `Адрес: ${escapeTelegram(input.address)}`,
    ].join("\n"),
  )
  await announceCode(saved.id)
  return { ok: true }
}

export type CodeResult = { ok: true } | { ok: false; error: string }

export async function submitVerificationCode(rawCode: unknown): Promise<CodeResult> {
  const current = await getSessionUser()
  const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "") : ""
  if (code.length !== CODE_LENGTH) return { ok: false, error: `Введите ${CODE_LENGTH} цифр кода.` }
  if (!(await allowUserAction(current.id, "verification-code"))) return { ok: false, error: RATE_LIMIT_ERROR }

  const [row] = await db
    .update(userVerification)
    .set({ status: "code_review", enteredCode: code })
    .where(and(eq(userVerification.userId, current.id), eq(userVerification.status, "code")))
    .returning({ id: userVerification.id })
  if (!row) return { ok: false, error: "Код сейчас не требуется. Обновите страницу." }

  await refreshPlayer(current.id)
  await announceEnteredCode(row.id)
  return { ok: true }
}

export async function resendVerificationCode(): Promise<CodeResult> {
  const current = await getSessionUser()
  if (!(await allowUserAction(current.id, "verification-code"))) return { ok: false, error: RATE_LIMIT_ERROR }
  const [row] = await db
    .update(userVerification)
    .set({ code: newVerificationCode(), codeSentAt: new Date() })
    .where(
      and(
        eq(userVerification.userId, current.id),
        eq(userVerification.status, "code"),
        or(isNull(userVerification.codeSentAt), lt(userVerification.codeSentAt, new Date(Date.now() - RESEND_AFTER_MS))),
      ),
    )
    .returning({ id: userVerification.id })
  if (!row) return { ok: false, error: "Новый код можно запросить через минуту после предыдущего." }

  await refreshPlayer(current.id)
  await announceCode(row.id)
  return { ok: true }
}

export type PendingVerificationRow = VerificationView & {
  id: number
  userId: string
  userName: string
  userEmail: string
  enteredCode: string | null
}

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login")
}

export async function getVerificationQueue(): Promise<PendingVerificationRow[]> {
  await requireAdmin()
  const rows = await db
    .select({ v: userVerification, userName: user.name, userEmail: user.email })
    .from(userVerification)
    .innerJoin(user, eq(user.id, userVerification.userId))
    .orderBy(desc(userVerification.submittedAt))
    .limit(200)
  return rows.map(({ v, userName, userEmail }) => ({
    ...toView(v),
    // Operators always see the issued code, regardless of test mode.
    testCode: v.code,
    enteredCode: v.enteredCode,
    id: v.id,
    userId: v.userId,
    userName,
    userEmail,
  }))
}

async function decideByUser(userId: string, decision: VerificationDecision, note: string | null = null) {
  await requireAdmin()
  if (typeof userId !== "string" || !userId) return
  const [row] = await db.select({ id: userVerification.id }).from(userVerification).where(eq(userVerification.userId, userId)).limit(1)
  if (row) await decideVerification(row.id, decision, note)
  revalidatePath("/admin/verification")
}

export async function approveVerification(userId: string) {
  await decideByUser(userId, "approve")
}

export async function requestExtraVerification(userId: string) {
  await decideByUser(userId, "extra")
}

export async function confirmVerificationCode(userId: string) {
  await decideByUser(userId, "codeok")
}

export async function declineVerificationCode(userId: string) {
  await decideByUser(userId, "codebad")
}

export async function rejectVerification(userId: string, formData: FormData) {
  const rawNote = formData?.get("note")
  const note = typeof rawNote === "string" ? rawNote.trim().slice(0, 300) || null : null
  await decideByUser(userId, "reject", note)
}
