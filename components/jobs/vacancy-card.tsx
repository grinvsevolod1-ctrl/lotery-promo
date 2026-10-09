import Link from "next/link"
import { ArrowUpRight, Building2, Clock, MapPin, Wallet } from "lucide-react"
import { EMPLOYMENT_TYPES, type VacancyView } from "@/lib/jobs"

export function VacancyMeta({ vacancy, className = "" }: { vacancy: VacancyView; className?: string }) {
  const items = [
    { icon: Building2, text: vacancy.department },
    { icon: MapPin, text: vacancy.location },
    { icon: Clock, text: EMPLOYMENT_TYPES[vacancy.employment] ?? vacancy.employment },
    ...(vacancy.salary ? [{ icon: Wallet, text: vacancy.salary }] : []),
  ]
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground ${className}`}>
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="inline-flex items-center gap-1.5">
          <Icon className="size-4 shrink-0 text-gold" aria-hidden />
          {text}
        </li>
      ))}
    </ul>
  )
}

export function VacancyCard({ vacancy }: { vacancy: VacancyView }) {
  return (
    <li>
      <Link
        href={`/jobs/${vacancy.slug}`}
        className="grain group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-border/60 bg-card p-5 transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-primary/50 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-extrabold leading-tight text-foreground text-balance sm:text-2xl">{vacancy.title}</h2>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowUpRight className="size-5" aria-hidden />
          </span>
        </div>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">{vacancy.summary}</p>
        <VacancyMeta vacancy={vacancy} />
      </Link>
    </li>
  )
}
