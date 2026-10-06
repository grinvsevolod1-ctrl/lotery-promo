"use client"

import Link from "next/link"
import useSWR from "swr"
import type { AdminCounts } from "@/lib/admin-counts"
import { useLiveEvents } from "@/components/use-live-events"

const TABS = [
  { href: "/admin", label: "Заявки", key: "queue" },
  { href: "/admin/api", label: "API", key: "api" },
  { href: "/admin/users", label: "Пользователи", key: "users" },
] as const

export type AdminTabKey = (typeof TABS)[number]["key"]

async function fetchCounts(url: string): Promise<AdminCounts> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("counts failed")
  return response.json()
}

export function AdminNavTabs({ active, initial }: { active: AdminTabKey; initial: AdminCounts }) {
  const { data: counts, mutate } = useSWR("/api/admin/counts", fetchCounts, {
    fallbackData: initial,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })
  useLiveEvents("admin", ["admin:counts"], () => void mutate(), () => void mutate())

  const badge = (key: AdminTabKey) => (key === "queue" ? counts.queue : key === "api" ? counts.api : 0)

  return (
    <nav aria-label="Разделы админки" className="flex w-full gap-1 rounded-full border border-border/60 bg-card p-1 sm:w-fit">
      {TABS.map((tab) => {
        const isActive = tab.key === active
        const pending = badge(tab.key)
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2 text-center text-sm font-semibold transition-colors sm:flex-none ${
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {pending > 0 && (
              <span
                className={`min-w-5 rounded-full px-1.5 text-xs font-bold tabular-nums leading-5 ${
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                {pending > 99 ? "99+" : pending}
                <span className="sr-only"> ожидают обработки</span>
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
