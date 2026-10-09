import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { JobsShell } from "@/components/jobs/jobs-shell"
import { ApplicationStatus } from "@/components/jobs/application-status"
import { getApplicationByToken } from "@/lib/jobs-data"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Статус анкеты — bytoloto.com",
  robots: { index: false, follow: false },
}

export default async function ApplicationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getApplicationByToken(token)
  if (!data) notFound()

  return (
    <JobsShell>
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Все вакансии
      </Link>
      <header className="mb-8 mt-6 flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">{data.vacancy.department}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground text-balance sm:text-4xl">{data.vacancy.title}</h1>
      </header>
      <ApplicationStatus data={data} />
    </JobsShell>
  )
}
