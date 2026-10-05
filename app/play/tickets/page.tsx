import type { Metadata } from "next"
import Link from "next/link"
import { getTickets } from "@/app/actions/cabinet"
import { settleLegacyTickets } from "@/lib/draws"
import { PageHeading } from "@/components/account/page-heading"
import { EmptyState } from "@/components/cabinet/panel"
import { TicketCard } from "@/components/cabinet/ticket-card"
import { AutoRefresh } from "@/components/auto-refresh"
import { BackToGames } from "@/components/play/back-to-games"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: "Мои билеты — bytoloto.com" }

export default async function TicketsPage() {
  await requireSession()
  await settleLegacyTickets()
  const tickets = await getTickets()

  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh intervalMs={20_000} />
      <BackToGames />
      <PageHeading title="Мои билеты" description="Все билеты и их результаты." />
      {tickets.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <EmptyState text="Пока нет билетов." />
          <Link
            href="/play/lottery"
            className="flex h-12 items-center rounded-full bg-primary px-6 font-bold text-primary-foreground transition active:scale-[0.97]"
          >
            Купить первый билет
          </Link>
        </div>
      ) : (
        <ul className="flex min-w-0 flex-col gap-3">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </ul>
      )}
    </div>
  )
}
