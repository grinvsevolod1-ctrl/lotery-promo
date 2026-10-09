import type { Metadata } from "next"
import { BadgeCheck, FileText, Mail } from "lucide-react"
import { JobsShell } from "@/components/jobs/jobs-shell"
import { VacancyCard } from "@/components/jobs/vacancy-card"
import { listOpenVacancies } from "@/lib/jobs-data"
import { site } from "@/lib/site"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Вакансии — bytoloto.com",
  description: "Открытые вакансии bytoloto.com: поддержка игроков, финансы, разработка. Откликнитесь онлайн — анкета с подтверждением личности через МСИ.",
  alternates: { canonical: "/jobs" },
}

const STEPS = [
  { icon: FileText, title: "Выберите вакансию и заполните анкету", text: "Коротко о себе, контакты и файлы: резюме, портфолио, сопроводительное письмо." },
  { icon: BadgeCheck, title: "Подтвердите личность", text: "Идентификационный номер и телефон проверяются через МСИ — так же, как в личном кабинете игрока." },
  { icon: Mail, title: "Получите письмо", text: "Сразу после подтверждения на почту придёт уведомление «анкета принята». Решение — в течение нескольких рабочих дней." },
]

type Vacancy = Awaited<ReturnType<typeof listOpenVacancies>>[number]

/** Keeps the admin sort order: a department appears where its first vacancy does. */
function groupByDepartment(items: Vacancy[]): Array<[string, Vacancy[]]> {
  const groups = new Map<string, Vacancy[]>()
  for (const item of items) {
    const list = groups.get(item.department) ?? []
    list.push(item)
    groups.set(item.department, list)
  }
  return Array.from(groups.entries())
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")
}

export default async function JobsPage() {
  const vacancies = await listOpenVacancies()

  return (
    <JobsShell wide>
      <section className="flex flex-col gap-5">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Карьера в {site.name}</p>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">
          Делаем лотереи, в которые хочется играть. Присоединяйтесь.
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Небольшая команда, быстрые решения и честная игра. Ниже — открытые позиции; отклик занимает пять минут.
        </p>
      </section>

      <section aria-labelledby="open-roles" className="mt-12 flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="open-roles" className="font-display text-2xl font-extrabold text-foreground">
            Открытые вакансии
          </h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold tabular-nums text-primary">{vacancies.length}</span>
        </div>
        {vacancies.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-muted-foreground">
            Сейчас открытых вакансий нет. Загляните позже или напишите на{" "}
            <a href={`mailto:${site.operator.email}`} className="font-semibold text-accent hover:underline">
              {site.operator.email}
            </a>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {groupByDepartment(vacancies).map(([department, items]) => (
              <section key={department} aria-labelledby={`dept-${slugify(department)}`} className="flex flex-col gap-4">
                <h3 id={`dept-${slugify(department)}`} className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {department}
                  <span className="h-px flex-1 bg-border/60" aria-hidden />
                  <span className="tabular-nums">{items.length}</span>
                </h3>
                <ul className="grid gap-4 md:grid-cols-2">
                  {items.map((v) => (
                    <VacancyCard key={v.id} vacancy={v} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="how-it-works" className="mt-14 flex flex-col gap-6">
        <h2 id="how-it-works" className="font-display text-2xl font-extrabold text-foreground">
          Как проходит отклик
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-3 rounded-3xl bg-secondary/60 p-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-card text-gold">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-semibold leading-snug text-foreground text-balance">{title}</h3>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </JobsShell>
  )
}
