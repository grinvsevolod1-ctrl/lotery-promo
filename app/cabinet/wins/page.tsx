import type { Metadata } from "next"
import Link from "next/link"
import { getTickets } from "@/app/actions/cabinet"
import { EmptyState } from "@/components/cabinet/panel"
import { TicketCard } from "@/components/cabinet/ticket-card"
import { PageHeading } from "@/components/account/page-heading"
import { TrophyMark } from "@/components/icons"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: "Мои выигрыши — bytoloto.com" }

export default async function WinsPage() {
  await requireSession()
  const tickets = await getTickets()
  const wins = tickets.filter((t) => t.status === "win")
  const total = wins.reduce((sum, t) => sum + t.prize, 0)
  const best = wins.reduce((max, t) => Math.max(max, t.prize), 0)
  const rate = tickets.length ? Math.round((wins.length / tickets.length) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Ваши результаты" title="Выигрыши" description="Все выигрышные билеты. Сумма зачисляется на баланс сразу после розыгрыша." />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-gold p-6 text-primary-foreground shadow-xl shadow-primary/25 sm:p-8">
        <TrophyMark className="absolute -right-4 -top-4 size-36 opacity-15" />
        <p className="text-sm font-medium opacity-85">Всего выиграно</p>
        <p className="mt-1 font-display text-5xl font-extrabold tabular-nums tracking-tight">
          {total.toLocaleString("ru-RU")} <span className="text-2xl opacity-85">BYN</span>
        </p>
        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-primary-foreground/20 pt-5">
          <div>
            <dt className="text-[11px] opacity-80">Выигрышей</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{wins.length}</dd>
          </div>
          <div>
            <dt className="text-[11px] opacity-80">Лучший, BYN</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{best.toLocaleString("ru-RU")}</dd>
          </div>
          <div>
            <dt className="text-[11px] opacity-80">Удачных</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{rate}%</dd>
          </div>
        </dl>
      </div>

      {wins.length === 0 ? (
        <div className="flex flex-col items-center gap-4">
          <EmptyState text="Пока без выигрышей — самое время испытать удачу." />
          <Link href="/play" className="flex h-14 items-center rounded-full bg-primary px-8 font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.97]">
            Перейти к играм
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {wins.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </ul>
      )}

      <Link href="/results" className="text-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
        Выигрыши всех участников
      </Link>
    </div>
  )
}
