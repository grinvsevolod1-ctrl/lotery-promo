import type { Metadata } from "next"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { getRecentWins, getWinStats } from "@/lib/draws"
import { formatDateTime } from "@/lib/format"

export const metadata: Metadata = {
  title: "Выигрыши участников — bytoloto.com",
  description: "Последние выигрыши в моментальных лотереях bytoloto.com: игра, сумма и время.",
  alternates: { canonical: "/results" },
}

export const dynamic = "force-dynamic"

export default async function ResultsPage() {
  const [wins, stats] = await Promise.all([getRecentWins(50), getWinStats()])

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <SiteHeader />
      <main className="relative flex-1 pb-16 pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl px-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">Моментальные игры</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">
            Выигрыши участников
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground text-pretty">
            Каждый билет разыгрывается сразу после покупки. Здесь — последние выигрышные билеты.
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-3">
            <Stat label="Билетов сыграно" value={stats.tickets.toLocaleString("ru-RU")} />
            <Stat label="Выигрышных" value={stats.wins.toLocaleString("ru-RU")} />
            <Stat label="Выплачено, BYN" value={stats.paid.toLocaleString("ru-RU")} />
          </dl>

          {wins.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-border p-10 text-center">
              <p className="text-muted-foreground">Пока нет выигрышей — станьте первым.</p>
              <Button nativeButton={false} render={<Link href="/sign-up" />} className="mt-5 h-12 rounded-full px-8 font-bold">
                Сыграть
              </Button>
            </div>
          ) : (
            <ul className="mt-8 flex flex-col gap-2">
              {wins.map((w) => (
                <li key={w.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {w.game} · угадано {w.matches} · {formatDateTime(w.at)}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-lg font-extrabold text-gold">+{w.prize.toLocaleString("ru-RU")} BYN</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-xl font-extrabold text-foreground sm:text-2xl">{value}</dd>
    </div>
  )
}
