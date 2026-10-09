import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { JobsShell } from "@/components/jobs/jobs-shell"
import { VacancyMeta } from "@/components/jobs/vacancy-card"
import { ApplicationForm } from "@/components/jobs/application-form"
import { getVacancyBySlug } from "@/lib/jobs-data"
import { EMPLOYMENT_TYPES } from "@/lib/jobs"
import { site } from "@/lib/site"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const vacancy = await getVacancyBySlug(slug)
  if (!vacancy) return { title: "Вакансия не найдена — bytoloto.com" }
  return {
    title: `${vacancy.title} — вакансии bytoloto.com`,
    description: vacancy.summary,
    alternates: { canonical: `/jobs/${vacancy.slug}` },
  }
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-extrabold text-foreground">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-pretty text-sm leading-relaxed text-foreground/90 sm:text-base">
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-gold" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function VacancyPage({ params }: Props) {
  const { slug } = await params
  const vacancy = await getVacancyBySlug(slug)
  if (!vacancy) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: vacancy.title,
    description: vacancy.description,
    datePosted: vacancy.createdAt.toISOString(),
    employmentType: vacancy.employment.toUpperCase(),
    hiringOrganization: { "@type": "Organization", name: site.name, sameAs: site.url },
    jobLocation: { "@type": "Place", address: vacancy.location },
    ...(vacancy.salary ? { baseSalary: { "@type": "MonetaryAmount", currency: "BYN", value: vacancy.salary } } : {}),
  }

  return (
    <JobsShell wide>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Все вакансии
      </Link>

      <header className="mt-6 flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">{vacancy.department}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">{vacancy.title}</h1>
        <VacancyMeta vacancy={vacancy} className="text-base" />
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <article className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            {vacancy.description.split(/\n{2,}/).map((part, i) => (
              <p key={i} className="text-pretty leading-relaxed text-foreground/90 sm:text-lg">
                {part}
              </p>
            ))}
          </section>
          <Section title="Чем предстоит заниматься" items={vacancy.responsibilities} />
          <Section title="Что мы ждём" items={vacancy.requirements} />
          <Section title="Что предлагаем" items={vacancy.benefits} />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-secondary/60 p-4">
              <dt className="text-xs text-muted-foreground">Формат</dt>
              <dd className="mt-1 font-semibold text-foreground">{EMPLOYMENT_TYPES[vacancy.employment]}</dd>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <dt className="text-xs text-muted-foreground">Локация</dt>
              <dd className="mt-1 font-semibold text-foreground">{vacancy.location}</dd>
            </div>
          </dl>
        </article>

        <div id="apply" className="lg:sticky lg:top-24">
          <ApplicationForm slug={vacancy.slug} vacancyTitle={vacancy.title} />
        </div>
      </div>
    </JobsShell>
  )
}
