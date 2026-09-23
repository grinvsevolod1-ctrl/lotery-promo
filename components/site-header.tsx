import Link from "next/link"
import { TicketMark } from "@/components/icons"
import { HeaderAuthNav } from "@/components/header-auth-nav"

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="container-page flex max-w-6xl items-center justify-between gap-2 py-4 sm:py-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 sm:gap-2.5"
          aria-label="lotery.by — на главную"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40 transition-transform group-hover:-rotate-6 sm:h-11 sm:w-11 sm:rounded-2xl">
            <TicketMark className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold animate-twinkle" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
            lotery<span className="text-gold">.by</span>
          </span>
        </Link>
        <HeaderAuthNav />
      </div>
    </header>
  )
}
