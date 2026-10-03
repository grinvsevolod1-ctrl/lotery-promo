import type { Metadata } from "next"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { DrawCountdown } from "@/components/draw-countdown"
import { BallRow } from "@/components/lotto-ball"
import { Button } from "@/components/ui/button"
import { TrophyMark, TicketMark, CoinMark } from "@/components/icons"
import { getNextDraw, getSettledDraws, settleDueDraws } from "@/lib/draws"
import { formatDateTime } from "@/lib/format"
import { parseNumbers } from "@/lib/lottery"

export const metadata: Metadata = {
  title: "Результаты тиражей — lotery.by",
  description: "Выигрышные комбинации всех прошедших тиражей lotery.by, количество билетов и победителей в каждом розыгрыше.",
  alternates: { canonical: "/results" },
}

export const dynamic = "force-dynamic"

export default async function ResultsPage() {
  await settleDueDraws()
  const [draws, nextDraw] = await Promise.all([getSettledDraws(30), getNextDraw()])

  const totals = draws.reduce(
    (acc, d) => ({ tickets: acc.tickets + d.ticketsCount, winners: acc.winners + d.winnersCount, prize: acc.prize + d.prizeTotal }),
    { tickets: 0, winners: 0, prize: 0 },
  )

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-40" aria-hidden />
      <SiteHeader />
      <main className="relative flex-1 pb-16 pt-28 md:pt-32">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gold">Открытые результаты</p>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">
                Результаты тиражей
              </h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
                Каждый день в 20:00 по Минску сервер формирует одну выигрышную комбинацию для всех билетов тиража.
                Здесь публикуются все прошедшие розыгрыши.
              </p>
            </div>
            <DrawCountdown drawAt={nextDraw.drawAt.toISOString()} title={`Тираж №${nextDraw.id} через`} />
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Stat icon={<TrophyMark className="size-5" />} label="Проведено тиражей" value={String(draws.length)} />
            <Stat icon={<TicketMark className="size-5" />} label="Билетов участвовало" value={totals.tickets.toLocaleString("ru-RU")} />
            <Stat icon={<CoinMark className="size-5" />} label="Выплачено бонусов" value={`${totals.prize.toLocaleString("ru-RU")} BYN`} />
          </div>

          <section className="mt-12" aria-labelledby="draws-heading">
            <h2 id="draws-heading" className="sr-only">
              Список тиражей
            </h2>
            {draws.length === 0 ? (
              <div className="grain relative rounded-3xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
                <p className="font-display text-xl font-extrabold text-foreground">Первый тираж ещё впереди</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Результаты появятся здесь сразу после розыгрыша {formatDateTime(nextDraw.drawAt)}.
                </p>
              </div>
            ) : (
              <ol className="flex flex-col gap-3">
                {draws.map((d) => {
                  const winning = d.winningNumbers ? parseNumbers(d.winningNumbers) : []
                  return (
                    <li
                      key={d.id}
                      className="grain relative grid gap-4 rounded-3xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl sm:grid-cols-[8rem_1fr_auto] sm:items-center"
                    >
                      <div>
                        <p className="font-display text-xl font-extrabold text-foreground">№{d.id}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(d.drawAt)}</p>
                      </div>
                      {winning.length > 0 ? (
                        <BallRow numbers={winning} highlight={new Set(winning)} size="md" />
                      ) : (
                        <p className="text-sm text-muted-foreground">Тираж проведён до запуска единой комбинации</p>
                      )}
                      <dl className="flex gap-6 text-sm sm:text-right">
                        <div>
                          <dt className="text-xs text-muted-foreground">Билетов</dt>
                          <dd className="font-semibold text-foreground">{d.ticketsCount}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Победителей</dt>
                          <dd className="font-semibold text-foreground">{d.winnersCount}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Выплачено</dt>
                          <dd className="font-display font-extrabold text-gold">{d.prizeTotal} BYN</dd>
                        </div>
                      </dl>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl border border-gold/30 bg-gradient-to-br from-primary/20 to-accent/10 p-8 text-center">
            <h2 className="font-display text-2xl font-extrabold text-foreground text-balance">
              Следующий тираж — {formatDateTime(nextDraw.drawAt)}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground text-pretty">
              Зарегистрируйтесь, заберите приветственный бонус и соберите свою комбинацию до начала розыгрыша.
            </p>
            <Button size="lg" nativeButton={false} render={<Link href="/sign-up" />} className="cta-shine h-12 rounded-full px-8 font-bold">
              Участвовать
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grain relative rounded-3xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl">
      <span className="mb-3 inline-flex rounded-xl bg-foreground/10 p-2 text-gold">{icon}</span>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  )
}
