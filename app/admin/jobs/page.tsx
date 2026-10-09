import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { AdminNav } from "@/components/admin/admin-nav"
import { AutoRefresh } from "@/components/auto-refresh"
import { VacanciesPanel } from "@/components/admin/jobs/vacancies-panel"
import { ApplicationsQueue } from "@/components/admin/jobs/applications-queue"
import { listAllVacancies, listApplicationsForAdmin } from "@/lib/jobs-data"

export const metadata = { title: "Вакансии — админка bytoloto.com", robots: { index: false, follow: false } }

export default async function AdminJobsPage() {
  if (!(await isAdmin())) redirect("/admin/login")
  const [vacancies, applications] = await Promise.all([listAllVacancies(), listApplicationsForAdmin()])

  const counts: Record<number, number> = {}
  for (const row of applications) {
    const vacancy = vacancies.find((v) => v.slug === row.vacancySlug)
    if (vacancy) counts[vacancy.id] = (counts[vacancy.id] ?? 0) + 1
  }

  const stats = [
    { label: "Открытых вакансий", value: vacancies.filter((v) => v.active).length },
    { label: "Анкет всего", value: applications.length },
    { label: "Ждут решения", value: applications.filter((a) => a.status === "pending" || a.status === "code_review").length },
    { label: "Одобрено", value: applications.filter((a) => a.status === "approved").length },
  ]

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <AutoRefresh intervalMs={60_000} liveScope="admin" liveTopics={["admin:jobs"]} />
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav active="jobs" subtitle="Вакансии на jobs.bytoloto.com и анкеты кандидатов с проверкой через МСИ" />

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border/60 bg-card p-4">
              <dt className="text-xs text-muted-foreground">{card.label}</dt>
              <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums text-foreground">{card.value}</dd>
            </div>
          ))}
        </dl>

        <ApplicationsQueue rows={applications} />
        <VacanciesPanel vacancies={vacancies} applicationCounts={counts} />
      </div>
    </main>
  )
}
