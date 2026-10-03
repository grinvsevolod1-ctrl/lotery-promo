import Link from "next/link"
import { TicketMark } from "@/components/icons"
import { HeaderAuthNav } from "@/components/header-auth-nav"

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="lotery.by — на главную">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40 transition-transform group-hover:-rotate-6">
            <TicketMark className="h-6 w-6 text-primary-foreground" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold animate-twinkle" aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
            lotery<span className="text-gold">.by</span>
          </span>
        </Link>
        <nav aria-label="Основное меню" className="hidden items-center gap-7 text-sm font-semibold text-foreground/80 md:flex">
          <Link href="/results" className="transition-colors hover:text-gold">
            Результаты тиражей
          </Link>
          <Link href="/rules" className="transition-colors hover:text-gold">
            Правила
          </Link>
        </nav>
        <HeaderAuthNav />
      </div>
    </header>
  )
}
