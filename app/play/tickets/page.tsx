import type { Metadata } from "next"
import Link from "next/link"
import { countTickets, getTickets } from "@/app/actions/cabinet"
import { Pagination } from "@/components/cabinet/pagination"
import { settleLegacyTickets } from "@/lib/draws"
import { PageHeading } from "@/components/account/page-heading"
import { EmptyState } from "@/components/cabinet/panel"
import { TicketCard } from "@/components/cabinet/ticket-card"
import { AutoRefresh } from "@/components/auto-refresh"
import { BackToGames } from "@/components/play/back-to-games"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: "Мои билеты — bytoloto.com" }

const PAGE_SIZE = 15

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireSession()
  await settleLegacyTickets()
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1)
  const [tickets, totalCount] = await Promise.all([getTickets(PAGE_SIZE, (page - 1) * PAGE_SIZE), countTickets()])
  const pages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

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
      <Pagination page={page} pages={pages} hrefFor={(p) => (p > 1 ? `/play/tickets?page=${p}` : "/play/tickets")} />
    </div>
  )
}
