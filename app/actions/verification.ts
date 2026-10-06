"use server"

import { and, desc, eq, ne } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { user, userVerification } from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"
import { isAdmin } from "@/lib/admin-auth"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { publish, topics } from "@/lib/realtime"
import { escapeTelegram, notifyTelegram } from "@/lib/telegram"
import { notifySafe } from "@/lib/notifications"
import {
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
  }
}

export async function getMyVerification(userId: string): Promise<VerificationView | null> {
  const [row] = await db.select().from(userVerification).where(eq(userVerification.userId, userId)).limit(1)
  return row ? toView(row) : null
}

export async function submitVerification(raw: Partial<Record<keyof VerificationInput, unknown>>): Promise<VerificationResult> {
  const current = await getSessionUser()
  const input = normalizeVerification(raw)
  const fieldErrors = validateVerification(input)
  if (Object.keys(fieldErrors).length > 0) return { ok: false, error: "Проверьте выделенные поля.", fieldErrors }
  if (!(await allowUserAction(current.id, "verification"))) return { ok: false, error: RATE_LIMIT_ERROR }

  const values = {
    ...input,
    middleName: input.middleName || null,
    status: "pending",
    note: null,
    submittedAt: new Date(),
    reviewedAt: null,
  }
  // Approved and in-review applications are locked; only a new or rejected one can be (re)submitted.
  const [saved] = await db
    .insert(userVerification)
    .values({ userId: current.id, ...values })
    .onConflictDoUpdate({ target: userVerification.userId, set: values, setWhere: eq(userVerification.status, "rejected") })
    .returning({ userId: userVerification.userId })
  if (!saved) return { ok: false, error: "Заявка уже на проверке или подтверждена." }

  revalidatePath("/cabinet/profile")
  await Promise.all([publish(topics.adminVerification), publish(topics.adminCounts)])
  void notifyTelegram(
    [
      "<b>Заявка на верификацию</b>",
      `Игрок: ${escapeTelegram(current.name)} (${escapeTelegram(current.email)})`,
      `ФИО: ${escapeTelegram([input.lastName, input.firstName, input.middleName].filter(Boolean).join(" "))}`,
      `Документ: ${DOCUMENT_TYPES[input.documentType as DocumentType]}`,
    ].join("\n"),
  )
  return { ok: true }
}

export type PendingVerificationRow = VerificationView & { userId: string; userName: string; userEmail: string }

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
  return rows.map(({ v, userName, userEmail }) => ({ ...toView(v), userId: v.userId, userName, userEmail }))
}

export async function reviewVerification(userId: string, decision: "approve" | "reject", formData?: FormData) {
  await requireAdmin()
  if (typeof userId !== "string" || !userId) return
  const rawNote = formData?.get("note")
  const note = decision === "reject" && typeof rawNote === "string" ? rawNote.trim().slice(0, 300) || null : null

  const [row] = await db
    .update(userVerification)
    .set({ status: decision === "approve" ? "approved" : "rejected", note, reviewedAt: new Date() })
    .where(and(eq(userVerification.userId, userId), ne(userVerification.status, decision === "approve" ? "approved" : "rejected")))
    .returning({ userId: userVerification.userId })

  revalidatePath("/admin/verification")
  if (!row) return
  await Promise.all([publish(topics.adminVerification), publish(topics.adminCounts)])
  await notifySafe(userId, {
    kind: "system",
    title: decision === "approve" ? "Личность подтверждена" : "Верификация отклонена",
    body:
      decision === "approve"
        ? "Ваши данные проверены. Теперь вам доступны все возможности аккаунта."
        : note ?? "Проверьте данные в профиле и отправьте заявку повторно.",
    href: "/cabinet/profile",
  })
}

export async function approveVerification(userId: string) {
  await reviewVerification(userId, "approve")
}

export async function rejectVerification(userId: string, formData: FormData) {
  await reviewVerification(userId, "reject", formData)
}
