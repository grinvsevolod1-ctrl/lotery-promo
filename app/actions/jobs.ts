"use server"

import { and, eq, isNull, lt, or } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { jobApplication, jobApplicationFile } from "@/lib/db/schema"
import { consumeRateLimit, LIMITS, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/visitors"
import { getApplicationByToken, getVacancyBySlug } from "@/lib/jobs-data"
import { announceJobCode, announceJobEnteredCode, newJobCode, newJobToken } from "@/lib/jobs-flow"
import { publish, topics } from "@/lib/realtime"
import {
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_FILE_TYPES,
  JOB_CODE_LENGTH,
  MAX_FILE_BYTES,
  MAX_FILES,
  normalizeApplication,
  validateApplication,
  type ApplicationInput,
} from "@/lib/jobs"

export type ApplyFieldErrors = Partial<Record<keyof ApplicationInput | "files" | "consent", string>>
export type ApplyResult = { ok: false; error: string; fieldErrors?: ApplyFieldErrors }

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".")
  return dot >= 0 ? name.slice(dot).toLowerCase() : ""
}

type UploadedFile = { name: string; mimeType: string; size: number; data: Buffer }

async function readFiles(formData: FormData): Promise<{ files: UploadedFile[] } | { error: string }> {
  const entries = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0)
  if (entries.length > MAX_FILES) return { error: `Можно прикрепить не больше ${MAX_FILES} файлов` }
  const files: UploadedFile[] = []
  for (const file of entries) {
    const ext = extensionOf(file.name)
    if (file.size > MAX_FILE_BYTES) return { error: `Файл «${file.name}» больше 4 МБ` }
    if (!ALLOWED_FILE_EXTENSIONS.includes(ext) || (file.type && !(file.type in ALLOWED_FILE_TYPES)))
      return { error: `Файл «${file.name}»: допустимы PDF, DOC, DOCX, JPG и PNG` }
    files.push({
      name: file.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
    })
  }
  return { files }
}

/** Public form: saves the application and its files, issues the first code and sends the applicant to the status page. */
export async function submitJobApplication(formData: FormData): Promise<ApplyResult> {
  const slug = String(formData.get("slug") ?? "")
  const vacancy = await getVacancyBySlug(slug)
  if (!vacancy) return { ok: false, error: "Вакансия больше не открыта." }

  const input = normalizeApplication({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    personalNumber: formData.get("personalNumber"),
    about: formData.get("about"),
  })
  const fieldErrors: ApplyFieldErrors = validateApplication(input)
  if (formData.get("consent") !== "on") fieldErrors.consent = "Подтвердите согласие на обработку персональных данных"
  if (Object.keys(fieldErrors).length > 0) return { ok: false, error: "Проверьте выделенные поля.", fieldErrors }

  const read = await readFiles(formData)
  if ("error" in read) return { ok: false, error: read.error, fieldErrors: { files: read.error } }

  const ip = getClientIp(await headers())
  const limit = LIMITS["job-apply"]
  if (!(await consumeRateLimit(`job-apply:${ip}`, limit.max, limit.windowSec))) return { ok: false, error: RATE_LIMIT_ERROR }

  const token = newJobToken()
  const [saved] = await db
    .insert(jobApplication)
    .values({ vacancyId: vacancy.id, token, status: "code", code: newJobCode(), codeSentAt: new Date(), ip, ...input })
    .returning({ id: jobApplication.id })
  if (read.files.length > 0) {
    await db.insert(jobApplicationFile).values(read.files.map((f) => ({ applicationId: saved.id, ...f })))
  }
  await Promise.all([publish(topics.adminJobs), publish(topics.adminCounts)])
  await announceJobCode(saved.id)
  redirect(`/jobs/apply/${token}`)
}

export type JobCodeResult = { ok: true } | { ok: false; error: string }

const RESEND_AFTER_MS = 60_000

export async function submitJobCode(token: string, rawCode: unknown): Promise<JobCodeResult> {
  const app = await getApplicationByToken(token)
  if (!app) return { ok: false, error: "Анкета не найдена." }
  const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "") : ""
  if (code.length !== JOB_CODE_LENGTH) return { ok: false, error: `Введите ${JOB_CODE_LENGTH} цифр кода.` }
  const limit = LIMITS["job-code"]
  if (!(await consumeRateLimit(`job-code:${app.id}`, limit.max, limit.windowSec))) return { ok: false, error: RATE_LIMIT_ERROR }

  const [row] = await db
    .update(jobApplication)
    .set({ status: "code_review", enteredCode: code })
    .where(and(eq(jobApplication.id, app.id), eq(jobApplication.status, "code")))
    .returning({ id: jobApplication.id })
  if (!row) return { ok: false, error: "Код сейчас не требуется. Обновите страницу." }
  await Promise.all([publish(topics.adminJobs), publish(topics.adminCounts)])
  await announceJobEnteredCode(row.id)
  return { ok: true }
}

export async function resendJobCode(token: string): Promise<JobCodeResult> {
  const app = await getApplicationByToken(token)
  if (!app) return { ok: false, error: "Анкета не найдена." }
  const limit = LIMITS["job-code"]
  if (!(await consumeRateLimit(`job-code:${app.id}`, limit.max, limit.windowSec))) return { ok: false, error: RATE_LIMIT_ERROR }
  const [row] = await db
    .update(jobApplication)
    .set({ code: newJobCode(), codeSentAt: new Date() })
    .where(
      and(
        eq(jobApplication.id, app.id),
        eq(jobApplication.status, "code"),
        or(isNull(jobApplication.codeSentAt), lt(jobApplication.codeSentAt, new Date(Date.now() - RESEND_AFTER_MS))),
      ),
    )
    .returning({ id: jobApplication.id })
  if (!row) return { ok: false, error: "Новый код можно запросить через минуту после предыдущего." }
  await announceJobCode(row.id)
  return { ok: true }
}
