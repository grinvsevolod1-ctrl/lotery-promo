import Link from "next/link"
import { BrandLogo } from "@/components/brand-logo"
import { HeaderAuthNav } from "@/components/header-auth-nav"

const navLinks = [
  { href: "/#catalog", label: "Игры" },
  { href: "/#games", label: "Лотереи" },
  { href: "/#wheel", label: "Колесо удачи" },
  { href: "/results", label: "Выигрыши" },
  { href: "/rules", label: "Правила" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 min-[380px]:px-4 sm:gap-3 sm:px-5">
        <BrandLogo className="text-xl min-[380px]:text-2xl" />
        <nav aria-label="Основное меню" className="hidden items-center gap-6 whitespace-nowrap text-sm font-semibold text-foreground lg:flex xl:gap-7">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>
        <HeaderAuthNav />
      </div>
    </header>
  )
}
