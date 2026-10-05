import Link from "next/link"
import { CARD_STATUSES, CARD_STATUS_LABELS } from "@/lib/card-statuses"

function hrefFor(status: string | undefined, query: string | undefined) {
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  if (query) params.set("q", query)
  const search = params.toString()
  return search ? `/admin/api?${search}` : "/admin/api"
}

export function RequestFilters({ status, query, counts }: { status?: string; query?: string; counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  const chips = [{ key: undefined, label: "Все", total }, ...CARD_STATUSES.map((key) => ({ key, label: CARD_STATUS_LABELS[key], total: counts[key] ?? 0 }))]

  return (
    <div className="flex flex-col gap-3">
      <form action="/admin/api" className="flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="request-search" className="sr-only">Поиск заявки</label>
        <input
          id="request-search"
          name="q"
          defaultValue={query}
          maxLength={64}
          placeholder="Номер BL-..., последние 4 цифры, email или имя"
          className="min-w-0 flex-1 rounded-full border border-border/60 bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Найти
        </button>
      </form>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {chips.map((chip) => {
          const active = chip.key === status
          return (
            <Link
              key={chip.key ?? "all"}
              href={hrefFor(chip.key, query)}
              aria-current={active ? "true" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {chip.label}
              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-foreground">{chip.total}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
