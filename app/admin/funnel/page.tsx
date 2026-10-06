import Link from "next/link"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { AdminNav } from "@/components/admin/admin-nav"
import { FUNNEL_PERIODS, getFunnelReport, type FunnelPeriod } from "@/lib/funnel"

export const metadata = { title: "Воронка — админка bytoloto.com", robots: { index: false, follow: false } }

const PERIOD_LABEL: Record<FunnelPeriod, string> = { 1: "Сутки", 7: "7 дней", 30: "30 дней" }
const DEVICE_LABEL: Record<string, string> = { mobile: "Телефоны", tablet: "Планшеты", desktop: "Компьютеры" }

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0)

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login")
  const { days: raw } = await searchParams
  const days = (FUNNEL_PERIODS.find((p) => String(p) === raw) ?? 7) as FunnelPeriod
  const { steps, byDevice } = await getFunnelReport(days)
  const top = steps[0].count

  let worst = { index: -1, lost: 0 }
  steps.forEach((step, i) => {
    if (i === 0) return
    const lost = steps[i - 1].count - step.count
    if (lost > worst.lost) worst = { index: i, lost }
  })

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <AdminNav active="funnel" subtitle="На каком шаге уходят посетители" />

        <nav aria-label="Период" className="flex w-fit gap-1 rounded-full border border-border/60 bg-card p-1">
          {FUNNEL_PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/funnel?days=${p}`}
              aria-current={p === days ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${p === days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </nav>

        {worst.index > 0 && (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-foreground">
            Больше всего теряем между шагами <b>«{steps[worst.index - 1].label}»</b> и <b>«{steps[worst.index].label}»</b>:{" "}
            уходят {worst.lost} из {steps[worst.index - 1].count} ({pct(worst.lost, steps[worst.index - 1].count)}%).
          </p>
        )}

        <ol className="flex flex-col gap-3">
          {steps.map((step, i) => {
            const prev = i === 0 ? step.count : steps[i - 1].count
            const lost = prev - step.count
            return (
              <li key={step.key} className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.hint}</p>
                  </div>
                  <p className="font-display text-xl font-extrabold tabular-nums text-foreground">
                    {step.count}
                    <span className="ml-2 text-sm font-semibold text-muted-foreground">{pct(step.count, top)}%</span>
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct(step.count, top)}%` }} />
                </div>
                {i > 0 && lost > 0 && (
                  <p className="text-xs text-destructive">
                    Ушли на этом шаге: {lost} ({pct(lost, prev)}% от предыдущего)
                  </p>
                )}
              </li>
            )
          })}
        </ol>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">По устройствам</h2>
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-semibold">Устройство</th>
                  <th className="p-3 text-right font-semibold">Зашли</th>
                  <th className="p-3 text-right font-semibold">Регистрации</th>
                  <th className="p-3 text-right font-semibold">Пополнения</th>
                </tr>
              </thead>
              <tbody>
                {byDevice.map((d) => (
                  <tr key={d.device} className="border-t border-border/60 text-foreground">
                    <td className="p-3">{DEVICE_LABEL[d.device] ?? d.device}</td>
                    <td className="p-3 text-right tabular-nums">{d.visitors}</td>
                    <td className="p-3 text-right tabular-nums">{d.signups} <span className="text-muted-foreground">({pct(d.signups, d.visitors)}%)</span></td>
                    <td className="p-3 text-right tabular-nums">{d.deposits} <span className="text-muted-foreground">({pct(d.deposits, d.visitors)}%)</span></td>
                  </tr>
                ))}
                {byDevice.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Пока нет данных за этот период</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Считаются уникальные устройства, впервые зашедшие за период. Полная история действий каждого — во вкладке «Пользователи».
          </p>
        </section>
      </div>
    </main>
  )
}
