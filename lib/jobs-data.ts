import "server-only"
import { and, asc, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { jobApplication, jobApplicationFile, jobVacancy } from "@/lib/db/schema"
import { splitLines, type ApplicationView, type VacancyView } from "@/lib/jobs"

export function toVacancyView(row: typeof jobVacancy.$inferSelect): VacancyView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    department: row.department,
    location: row.location,
    employment: row.employment as VacancyView["employment"],
    salary: row.salary,
    summary: row.summary,
    description: row.description,
    responsibilities: splitLines(row.responsibilities),
    requirements: splitLines(row.requirements),
    benefits: splitLines(row.benefits),
    active: row.active,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  }
}

export async function listOpenVacancies(): Promise<VacancyView[]> {
  const rows = await db.select().from(jobVacancy).where(eq(jobVacancy.active, true)).orderBy(asc(jobVacancy.sortOrder), asc(jobVacancy.id))
  return rows.map(toVacancyView)
}

export async function listAllVacancies(): Promise<VacancyView[]> {
  const rows = await db.select().from(jobVacancy).orderBy(asc(jobVacancy.sortOrder), asc(jobVacancy.id))
  return rows.map(toVacancyView)
}

export async function getVacancyBySlug(slug: string): Promise<VacancyView | null> {
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,60}$/.test(slug)) return null
  const [row] = await db.select().from(jobVacancy).where(and(eq(jobVacancy.slug, slug), eq(jobVacancy.active, true))).limit(1)
  return row ? toVacancyView(row) : null
}

export function isJobToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{16,40}$/.test(token)
}

export async function getApplicationByToken(token: string): Promise<ApplicationView | null> {
  if (!isJobToken(token)) return null
  const [row] = await db
    .select({ a: jobApplication, v: { slug: jobVacancy.slug, title: jobVacancy.title, department: jobVacancy.department } })
    .from(jobApplication)
    .innerJoin(jobVacancy, eq(jobVacancy.id, jobApplication.vacancyId))
    .where(eq(jobApplication.token, token))
    .limit(1)
  if (!row) return null
  const files = await db
    .select({ id: jobApplicationFile.id, name: jobApplicationFile.name, size: jobApplicationFile.size })
    .from(jobApplicationFile)
    .where(eq(jobApplicationFile.applicationId, row.a.id))
    .orderBy(asc(jobApplicationFile.id))
  return {
    id: row.a.id,
    token: row.a.token,
    status: row.a.status as ApplicationView["status"],
    stage: row.a.stage,
    note: row.a.note,
    submittedAt: row.a.submittedAt,
    reviewedAt: row.a.reviewedAt,
    fullName: row.a.fullName,
    email: row.a.email,
    phone: row.a.phone,
    personalNumber: row.a.personalNumber,
    about: row.a.about,
    vacancy: row.v,
    files,
  }
}

export type AdminApplicationRow = {
  id: number
  token: string
  status: ApplicationView["status"]
  stage: number
  code: string | null
  enteredCode: string | null
  fullName: string
  email: string
  phone: string
  personalNumber: string
  about: string
  ip: string | null
  note: string | null
  submittedAt: Date
  reviewedAt: Date | null
  acceptedMailAt: Date | null
  vacancyTitle: string
  vacancySlug: string
  files: { id: number; name: string; size: number }[]
}

/** Latest applications first, with their attachments, for the admin queue. */
export async function listApplicationsForAdmin(): Promise<AdminApplicationRow[]> {
  const rows = await db
    .select({ a: jobApplication, vacancyTitle: jobVacancy.title, vacancySlug: jobVacancy.slug })
    .from(jobApplication)
    .innerJoin(jobVacancy, eq(jobVacancy.id, jobApplication.vacancyId))
    .orderBy(desc(jobApplication.submittedAt))
    .limit(300)
  const files = rows.length
    ? await db
        .select({ id: jobApplicationFile.id, applicationId: jobApplicationFile.applicationId, name: jobApplicationFile.name, size: jobApplicationFile.size })
        .from(jobApplicationFile)
        .orderBy(asc(jobApplicationFile.id))
    : []
  const byApp = new Map<number, AdminApplicationRow["files"]>()
  for (const f of files) {
    const list = byApp.get(f.applicationId) ?? []
    list.push({ id: f.id, name: f.name, size: f.size })
    byApp.set(f.applicationId, list)
  }
  return rows.map(({ a, vacancyTitle, vacancySlug }) => ({
    id: a.id,
    token: a.token,
    status: a.status as ApplicationView["status"],
    stage: a.stage,
    code: a.code,
    enteredCode: a.enteredCode,
    fullName: a.fullName,
    email: a.email,
    phone: a.phone,
    personalNumber: a.personalNumber,
    about: a.about,
    ip: a.ip,
    note: a.note,
    submittedAt: a.submittedAt,
    reviewedAt: a.reviewedAt,
    acceptedMailAt: a.acceptedMailAt,
    vacancyTitle,
    vacancySlug,
    files: byApp.get(a.id) ?? [],
  }))
}
