import Link from "next/link"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { getPlayerStats, listPlayers } from "@/app/actions/admin-players"
import { PLAYER_FILTERS, type PlayerFilter } from "@/lib/player-filters"
import { AdminNav } from "@/components/admin/admin-nav"
import { AutoRefresh } from "@/components/auto-refresh"
import { PlayersPanel } from "@/components/admin/players-panel"
import { BroadcastForm } from "@/components/admin/broadcast-form"

export const metadata = { title: "Пользователи — админка bytoloto.com", robots: { index: false, follow: false } }

const FILTER_TABS: { value: PlayerFilter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "unverified", label: "Без верификации" },
  { value: "blocked", label: "Заблокированные" },
]

function buildHref(filter: PlayerFilter, q?: string) {
  const params = new URLSearchParams()
  if (filter !== "all") params.set("filter", filter)
  if (q) params.set("q", q)
  const qs = params.toString()
  return qs ? `/admin/users?${qs}` : "/admin/users"
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>
}) {
  if (!(await isAdmin())) redirect("/admin/login")
  const params = await searchParams
  const q = params.q ?? ""
  const filter = ((PLAYER_FILTERS as readonly string[]).includes(params.filter ?? "") ? params.filter : "all") as PlayerFilter

  const [stats, players] = await Promise.all([getPlayerStats(), listPlayers(q, filter)])

  const statCards = [
    { label: "Зарегистрировано", value: stats.total },
    { label: "Новых за 24 часа", value: stats.last24h },
    { label: "Верифицированы", value: stats.verified },
    { label: "Заблокированы", value: stats.blocked },
  ]

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <AutoRefresh intervalMs={60_000} liveScope="admin" liveTopics={["admin:users"]} />
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav active="users" subtitle="Зарегистрированные игроки: баланс, блокировка, верификация и рассылки" />

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border/60 bg-card p-4">
              <dt className="text-xs text-muted-foreground">{card.label}</dt>
              <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums text-foreground">
                {card.value.toLocaleString("ru-RU")}
              </dd>
            </div>
          ))}
        </dl>

        <BroadcastForm />

        <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5" aria-labelledby="players-heading">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 id="players-heading" className="font-display text-lg font-bold text-foreground">
              Игроки <span className="text-muted-foreground">({players.length})</span>
            </h2>
            <form action="/admin/users" className="flex gap-2">
              {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
              <label htmlFor="players-q" className="sr-only">
                Поиск по имени или e-mail
              </label>
              <input
                id="players-q"
                name="q"
                defaultValue={q}
                placeholder="Имя или e-mail"
                className="h-10 w-full min-w-0 rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-64"
              />
              <button type="submit" className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                Найти
              </button>
            </form>
          </div>

          <nav aria-label="Фильтр игроков" className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={buildHref(tab.value, q)}
                aria-current={tab.value === filter ? "page" : undefined}
                className={
                  tab.value === filter
                    ? "rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background"
                    : "rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                }
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <PlayersPanel players={players} />
        </section>
      </div>
    </main>
  )
}
