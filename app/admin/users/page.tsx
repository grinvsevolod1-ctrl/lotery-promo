import Link from "next/link"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { getVisitorStats, listVisitors } from "@/app/actions/admin-users"
import { AdminNav } from "@/components/admin/admin-nav"
import { AutoRefresh } from "@/components/auto-refresh"
import { formatDateTime } from "@/lib/format"

export const metadata = { title: "Пользователи — админка bytoloto.com", robots: { index: false, follow: false } }

const DEVICE_TABS = [
  { value: "", label: "Люди" },
  { value: "mobile", label: "Телефоны" },
  { value: "tablet", label: "Планшеты" },
  { value: "desktop", label: "Компьютеры" },
  { value: "bot", label: "Боты" },
] as const

const DEVICE_LABEL: Record<string, string> = {
  mobile: "Телефон",
  tablet: "Планшет",
  desktop: "Компьютер",
  bot: "Бот",
}

function buildHref(device: string, q?: string) {
  const params = new URLSearchParams()
  if (device) params.set("device", device)
  if (q) params.set("q", q)
  const qs = params.toString()
  return qs ? `/admin/users?${qs}` : "/admin/users"
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ device?: string; q?: string }>
}) {
  if (!(await isAdmin())) redirect("/admin/login")
  const { device = "", q = "" } = await searchParams

  const [stats, visitors] = await Promise.all([getVisitorStats(), listVisitors(q, device)])

  const statCards = [
    { label: "Уникальных IP", value: stats.uniqueIps },
    { label: "Устройств", value: stats.devices },
    { label: "Активны за 24 часа", value: stats.last24h },
    { label: "Всего заходов", value: stats.totalHits },
  ]

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <AutoRefresh intervalMs={15_000} />
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav active="users" subtitle="Все IP и устройства, которые заходили на сайт" />

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

        <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5" aria-labelledby="visitors-heading">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 id="visitors-heading" className="font-display text-lg font-bold text-foreground">
              Посетители
            </h2>
            <form action="/admin/users" className="flex gap-2">
              {device && <input type="hidden" name="device" value={device} />}
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="IP, почта, браузер, система"
                aria-label="Поиск посетителей"
                className="h-10 w-full min-w-0 rounded-full border border-border/60 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground lg:w-72"
              />
              <button type="submit" className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                Найти
              </button>
            </form>
          </div>

          <nav aria-label="Тип устройства" className="flex flex-wrap gap-2">
            {DEVICE_TABS.map((tab) => {
              const isActive = tab.value === device
              return (
                <Link
                  key={tab.value || "all"}
                  href={buildHref(tab.value, q)}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          {visitors.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Посетителей по этому фильтру пока нет.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/60">
              {visitors.map((visitor) => (
                <li key={visitor.id} className="flex flex-col gap-1.5 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-sm font-semibold text-foreground">{visitor.ip}</span>
                    <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs text-foreground">
                      {DEVICE_LABEL[visitor.deviceType] ?? visitor.deviceType}
                    </span>
                    {visitor.email ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{visitor.email}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">гость</span>
                    )}
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">{formatDateTime(visitor.lastSeenAt)}</span>
                  </div>
                  <p className="text-sm text-foreground">
                    {visitor.browser} · {visitor.os}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Последняя страница <span className="font-mono">{visitor.lastPath}</span> · заходов {visitor.hits} · впервые{" "}
                    {formatDateTime(visitor.firstSeenAt)}
                  </p>
                  <details className="text-xs text-muted-foreground">
                    <summary className="w-fit cursor-pointer hover:text-foreground">Полная строка устройства</summary>
                    <p className="mt-1 break-all font-mono">{visitor.userAgent}</p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
