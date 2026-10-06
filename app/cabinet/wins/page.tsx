import type { Metadata } from "next"
import Link from "next/link"
import { and, count, desc, eq, gt, inArray, like, notLike, or, sql, sum, max, type SQL } from "drizzle-orm"
import { Coins, Dices, Gift, LayoutGrid, Sparkles, Ticket, Trophy } from "lucide-react"
import { db } from "@/lib/db"
import { transaction } from "@/lib/db/schema"
import { PageHeading } from "@/components/account/page-heading"
import { EmptyState } from "@/components/cabinet/panel"
import { Pagination } from "@/components/cabinet/pagination"
import { PLINKO_GAME_NAME } from "@/lib/games/plinko"
import { requireSession } from "@/lib/require-session"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Мои выигрыши — bytoloto.com" }

const PAGE_SIZE = 15

const FILTERS = [
  { id: "all", label: "Все", icon: LayoutGrid },
  { id: "lottery", label: "Лотерея", icon: Ticket },
  { id: "plinko", label: "Плинко", icon: Dices },
  { id: "scratch", label: "Скретч", icon: Sparkles },
  { id: "wheel", label: "Колесо", icon: Coins },
  { id: "bonus", label: "Бонусы", icon: Gift },
] as const

type FilterId = (typeof FILTERS)[number]["id"]

const LOTTERY_PREFIX = "Выигрыш: билет%"
const PLINKO_PATTERN = `Выигрыш: ${PLINKO_GAME_NAME}%`

function filterCondition(id: FilterId): SQL {
  const prize = eq(transaction.type, "prize")
  switch (id) {
    case "lottery":
      return and(prize, like(transaction.description, LOTTERY_PREFIX))!
    case "plinko":
      return and(prize, like(transaction.description, PLINKO_PATTERN))!
    case "scratch":
      return and(prize, notLike(transaction.description, LOTTERY_PREFIX), notLike(transaction.description, PLINKO_PATTERN))!
    case "wheel":
      return eq(transaction.type, "spin")
    case "bonus":
      return inArray(transaction.type, ["bonus", "referral", "welcome"])
    default:
      return or(eq(transaction.type, "prize"), eq(transaction.type, "spin"), inArray(transaction.type, ["bonus", "referral", "welcome"]))!
  }
}

function categoryOf(type: string, description: string): (typeof FILTERS)[number] {
  if (type === "spin") return FILTERS[4]
  if (type !== "prize") return FILTERS[5]
  if (description.startsWith("Выигрыш: билет")) return FILTERS[1]
  if (description.startsWith(`Выигрыш: ${PLINKO_GAME_NAME}`)) return FILTERS[2]
  return FILTERS[3]
}

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Minsk" })

export default async function WinsPage({ searchParams }: { searchParams: Promise<{ game?: string; page?: string }> }) {
  const session = await requireSession()
  const params = await searchParams
  const filter: FilterId = FILTERS.some((f) => f.id === params.game) ? (params.game as FilterId) : "all"
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)

  const where = and(eq(transaction.userId, session.user.id), gt(transaction.amount, sql`0`), filterCondition(filter))

  const [rows, [totals]] = await Promise.all([
    db
      .select({ id: transaction.id, type: transaction.type, amount: transaction.amount, description: transaction.description, createdAt: transaction.createdAt })
      .from(transaction)
      .where(where)
      .orderBy(desc(transaction.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count(), total: sum(transaction.amount), best: max(transaction.amount) }).from(transaction).where(where),
  ])

  const total = Number(totals?.total ?? 0)
  const best = Number(totals?.best ?? 0)
  const pages = Math.max(1, Math.ceil((totals?.n ?? 0) / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-5">
      <PageHeading eyebrow="Ваши результаты" title="Выигрыши" description="Все выигрыши по играм. Деньги зачисляются на баланс сразу." />

      <section className="grid grid-cols-3 gap-2 rounded-3xl bg-card p-4 ring-1 ring-border">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Выиграно</span>
          <span className="font-display text-lg font-extrabold tabular-nums text-foreground">
            {total.toLocaleString("ru-RU")} <span className="text-xs text-primary">BYN</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Выигрышей</span>
          <span className="font-display text-lg font-extrabold tabular-nums text-foreground">{totals?.n ?? 0}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Лучший</span>
          <span className="font-display text-lg font-extrabold tabular-nums text-foreground">
            {best.toLocaleString("ru-RU")} <span className="text-xs text-primary">BYN</span>
          </span>
        </div>
      </section>

      <nav aria-label="Фильтр по играм" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {FILTERS.map((f) => {
            const active = f.id === filter
            const Icon = f.icon
            return (
              <li key={f.id}>
                <Link
                  href={f.id === "all" ? "/cabinet/wins" : `/cabinet/wins?game=${f.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold ring-1 transition",
                    active ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-foreground ring-border hover:ring-primary/40",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {f.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-4">
          <EmptyState text="Здесь пока пусто — самое время испытать удачу." />
          <Link href="/play" className="flex h-12 items-center rounded-full bg-primary px-7 font-bold text-primary-foreground transition active:scale-[0.97]">
            Перейти к играм
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border">
          {rows.map((row) => {
            const cat = categoryOf(row.type, row.description)
            const Icon = cat.icon
            return (
              <li key={row.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{row.description.replace(/^Выигрыш:\s*/, "")}</p>
                  <p className="text-xs text-muted-foreground">
                    {cat.label} · {dateFormat.format(row.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 font-display text-base font-extrabold tabular-nums text-primary">
                  +{Number(row.amount).toLocaleString("ru-RU")}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <Pagination page={page} pages={pages} hrefFor={(p) => `/cabinet/wins?${new URLSearchParams({ ...(filter !== "all" && { game: filter }), ...(p > 1 && { page: String(p) }) })}`} />

      <Link href="/results" className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
        <Trophy className="size-4" aria-hidden />
        Выигрыши всех участников
      </Link>
    </div>
  )
}
