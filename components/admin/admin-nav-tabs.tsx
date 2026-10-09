"use client"

import Link from "next/link"
import useSWR from "swr"
import { BadgeCheck, BriefcaseBusiness, ChartNoAxesColumn, Gift, Inbox, LifeBuoy, PlugZap, Radar, Send, Users, type LucideIcon } from "lucide-react"
import type { AdminCounts } from "@/lib/admin-counts"
import { useLiveEvents } from "@/components/use-live-events"

type Tab = { href: string; label: string; key: string; icon: LucideIcon }

const GROUPS = [
  {
    title: "Работа",
    tabs: [
      { href: "/admin", label: "Заявки", key: "queue", icon: Inbox },
      { href: "/admin/verification", label: "Верификация", key: "verification", icon: BadgeCheck },
      { href: "/admin/support", label: "Поддержка", key: "support", icon: LifeBuoy },
      { href: "/admin/jobs", label: "Вакансии", key: "jobs", icon: BriefcaseBusiness },
    ],
  },
  {
    title: "Игроки",
    tabs: [
      { href: "/admin/users", label: "Пользователи", key: "users", icon: Users },
      { href: "/admin/bonuses", label: "Бонусы", key: "bonuses", icon: Gift },
    ],
  },
  {
    title: "Аналитика",
    tabs: [
      { href: "/admin/visitors", label: "Посетители", key: "visitors", icon: Radar },
      { href: "/admin/funnel", label: "Воронка", key: "funnel", icon: ChartNoAxesColumn },
    ],
  },
  {
    title: "Настройки",
    tabs: [
      { href: "/admin/api", label: "API", key: "api", icon: PlugZap },
      { href: "/admin/telegram", label: "Telegram", key: "telegram", icon: Send },
    ],
  },
] as const satisfies readonly { title: string; tabs: readonly Tab[] }[]

export type AdminTabKey = (typeof GROUPS)[number]["tabs"][number]["key"]

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

  const badge = (key: AdminTabKey) =>
    key === "queue" ? counts.queue : key === "api" ? counts.api : key === "support" ? counts.support : key === "verification" ? (counts.verification ?? 0) : key === "jobs" ? (counts.jobs ?? 0) : 0

  return (
    <nav aria-label="Разделы админки" className="grid gap-4 rounded-3xl border border-border/60 bg-card p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[3fr_2fr_2fr_2fr]">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex min-w-0 flex-col gap-2">
          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group.title}</p>
          <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-1">
            {group.tabs.map((tab) => {
              const isActive = tab.key === active
              const pending = badge(tab.key)
              const Icon = tab.icon
              return (
                <li key={tab.key} className="min-w-0">
                  <Link
                    href={tab.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex h-full min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-xs font-semibold transition-colors sm:flex-row sm:gap-2.5 sm:px-3 sm:py-2 sm:text-sm ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-5 shrink-0 sm:size-4" aria-hidden="true" />
                    <span className="w-full truncate text-center sm:flex-1 sm:text-left">{tab.label}</span>
                    {pending > 0 && (
                      <span
                        className={`absolute right-1 top-1 min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold tabular-nums leading-5 sm:static ${
                          isActive ? "bg-primary-foreground/25 text-primary-foreground" : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {pending > 99 ? "99+" : pending}
                        <span className="sr-only"> ожидают обработки</span>
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
