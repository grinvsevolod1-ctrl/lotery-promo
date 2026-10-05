import Link from "next/link"
import { adminLogout } from "@/app/actions/admin"

const TABS = [
  { href: "/admin", label: "Заявки", key: "queue" },
  { href: "/admin/api", label: "API", key: "api" },
] as const

export function AdminNav({ active, subtitle }: { active: (typeof TABS)[number]["key"]; subtitle: string }) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Админ-панель</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/admin/api-docs"
            download
            className="rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
          >
            Документация API
          </a>
          <form action={adminLogout}>
            <button type="submit" className="rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5">
              Выйти
            </button>
          </form>
        </div>
      </div>
      <nav aria-label="Разделы админки" className="flex w-full gap-1 rounded-full border border-border/60 bg-card p-1 sm:w-fit">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex-1 rounded-full px-5 py-2 text-center text-sm font-semibold transition-colors sm:flex-none ${
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
