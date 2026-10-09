import type { ReactNode } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

/** Public frame for the jobs section: same header/footer as the marketing pages, content column in the middle. */
export function JobsShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-40" aria-hidden />
      <SiteHeader />
      <main className={`relative mx-auto w-full flex-1 px-4 pb-16 pt-10 sm:px-5 sm:pt-14 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>{children}</main>
      <SiteFooter />
    </div>
  )
}
