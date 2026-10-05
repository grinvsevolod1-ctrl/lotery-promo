import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRightMark as ArrowRight } from "@/components/icons"

export function GameCard({
  href,
  title,
  description,
  icon,
  status,
  accent = false,
}: {
  href: string
  title: string
  description: string
  icon: ReactNode
  status: string
  accent?: boolean
}) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className={`group flex h-full min-w-0 flex-col gap-4 rounded-3xl p-5 ring-1 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-6 ${
          accent ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-foreground ring-border hover:ring-primary/40"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
              accent ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"
            }`}
          >
            {icon}
          </span>
          <span
            className={`truncate rounded-full px-3 py-1 text-xs font-bold ${
              accent ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground"
            }`}
          >
            {status}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-extrabold text-balance">{title}</h2>
          <p className={`mt-1 text-sm leading-relaxed text-pretty ${accent ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
            {description}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold">
          Открыть
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Link>
    </li>
  )
}
