import type { ReactNode } from "react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { legalLinks, site } from "@/lib/site"
import { cn } from "@/lib/utils"

export function LegalPage({
  title,
  lead,
  current,
  children,
}: {
  title: string
  lead: string
  current: (typeof legalLinks)[number]["href"]
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-40" aria-hidden />
      <SiteHeader />
      <main className="relative flex-1 pb-16 pt-28 md:pt-32">
        <article className="mx-auto max-w-3xl px-5">
          <nav aria-label="Документы" className="mb-8 flex flex-wrap gap-2">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.href === current ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
                  link.href === current
                    ? "bg-gold text-gold-foreground"
                    : "bg-foreground/10 text-foreground/70 hover:bg-foreground/15 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs font-bold uppercase tracking-widest text-gold">
            Редакция от {site.legalUpdatedAt}
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground text-balance sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">{lead}</p>

          <div className="legal-prose mt-10">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
