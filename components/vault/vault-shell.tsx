"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Database, HardDriveDownload, LogOut } from "lucide-react"
import { vaultLogout } from "@/app/actions/vault"
import { formatBytes } from "@/lib/format-bytes"

const TABS = [
  { href: "/vault", label: "Загрузка", icon: HardDriveDownload },
] as const

export function VaultShell({ children, totals }: { children: React.ReactNode; totals: { files: number; bytes: number } }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await vaultLogout()
    router.replace("/vault")
    router.refresh()
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-16 pt-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Database className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold leading-tight">Хранилище</p>
            <p className="text-xs text-muted-foreground">
              {totals.files} файлов · {formatBytes(totals.bytes)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 px-3 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground"
        >
          <LogOut className="size-4" aria-hidden />
          Выйти
        </button>
      </header>

      <nav aria-label="Разделы" className="mt-6 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/vault" && pathname.startsWith(tab.href)) || (tab.href === "/vault" && pathname.startsWith("/vault/files"))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                active ? "bg-primary text-primary-foreground" : "bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" aria-hidden />
              {tab.label}
            </Link>
          )
        })}
      </nav>

      <main className="mt-6 flex-1">{children}</main>
    </div>
  )
}
