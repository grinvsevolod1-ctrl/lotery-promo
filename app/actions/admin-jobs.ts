"use server"

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { jobVacancy } from "@/lib/db/schema"
import { isAdmin } from "@/lib/admin-auth"
import type { ActionResult } from "@/app/actions/admin-players"
import { decideJobApplication, type JobDecision } from "@/lib/jobs-flow"
import { EMPLOYMENT_TYPES, slugify } from "@/lib/jobs"

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized")
}

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login")
}

function refreshJobs() {
  revalidatePath("/admin/jobs")
  revalidatePath("/jobs", "layout")
  revalidatePath("/sitemap.xml")
}

const str = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max)
const lines = (formData: FormData, key: string) => String(formData.get(key) ?? "").replace(/\r\n/g, "\n").trim().slice(0, 4000)

function parseVacancy(formData: FormData) {
  const title = str(formData, "title", 120)
  const department = str(formData, "department", 80)
  const location = str(formData, "location", 80)
  const employment = str(formData, "employment", 20)
  const summary = str(formData, "summary", 300)
  const description = lines(formData, "description")
  if (title.length < 3) throw new Error("Название слишком короткое")
  if (department.length < 2) throw new Error("Укажите отдел")
  if (location.length < 2) throw new Error("Укажите город или формат работы")
  if (!(employment in EMPLOYMENT_TYPES)) throw new Error("Выберите тип занятости")
  if (summary.length < 10) throw new Error("Добавьте короткое описание для карточки")
  if (description.length < 20) throw new Error("Добавьте описание вакансии")
  const rawSlug = str(formData, "slug", 60)
  const slug = slugify(rawSlug || title)
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug)) throw new Error("Адрес (slug): латинские буквы, цифры и дефис")
  const sortOrder = Number(str(formData, "sortOrder", 6) || 0)
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10_000) throw new Error("Порядок: целое число от 0 до 10000")
  return {
    slug,
    title,
    department,
    location,
    employment,
    salary: str(formData, "salary", 80) || null,
    summary,
    description,
    responsibilities: lines(formData, "responsibilities"),
    requirements: lines(formData, "requirements"),
    benefits: lines(formData, "benefits"),
    active: formData.get("active") === "on",
    sortOrder,
  }
}

export async function saveVacancy(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  const id = Number(formData.get("id") ?? 0)
  try {
    const values = parseVacancy(formData)
    if (id > 0) await db.update(jobVacancy).set({ ...values, updatedAt: new Date() }).where(eq(jobVacancy.id, id))
    else await db.insert(jobVacancy).values(values)
  } catch (error) {
    const message = (error as Error).message
    if ((error as { code?: string }).code === "23505") return { ok: false, error: "Вакансия с таким адресом (slug) уже есть" }
    return { ok: false, error: message.length < 120 ? message : "Не удалось сохранить вакансию" }
  }
  refreshJobs()
  return { ok: true, message: id > 0 ? "Вакансия обновлена" : "Вакансия создана" }
}

export async function toggleVacancy(id: number, active: boolean): Promise<ActionResult> {
  await assertAdmin()
  await db.update(jobVacancy).set({ active, updatedAt: new Date() }).where(eq(jobVacancy.id, id))
  refreshJobs()
  return { ok: true, message: active ? "Вакансия опубликована" : "Вакансия скрыта" }
}

export async function deleteVacancy(id: number): Promise<ActionResult> {
  await assertAdmin()
  await db.delete(jobVacancy).where(eq(jobVacancy.id, id))
  refreshJobs()
  return { ok: true, message: "Вакансия удалена вместе с анкетами" }
}

async function decide(id: number, decision: JobDecision, note: string | null = null) {
  await requireAdmin()
  if (!Number.isInteger(id)) return
  await decideJobApplication(id, decision, note)
  revalidatePath("/admin/jobs")
}

export async function confirmJobCode(id: number) {
  await decide(id, "codeok")
}

export async function declineJobCode(id: number) {
  await decide(id, "codebad")
}

export async function markJobNoMsi(id: number) {
  await decide(id, "nomsi")
}

export async function requestJobExtraCheck(id: number) {
  await decide(id, "extra")
}

export async function approveJobApplication(id: number) {
  await decide(id, "approve")
}

export async function rejectJobApplication(id: number, formData: FormData) {
  const rawNote = formData?.get("note")
  const note = typeof rawNote === "string" ? rawNote.trim().slice(0, 300) || null : null
  await decide(id, "reject", note)
}
