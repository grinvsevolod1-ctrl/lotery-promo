import { getBalance, getSpinStatus, getTickets } from "@/app/actions/cabinet"
import { settleLegacyTickets } from "@/lib/draws"
import { EmptyState } from "@/components/cabinet/panel"
import { BuyTicketPanel } from "@/components/cabinet/buy-ticket-panel"
import { DailySpin } from "@/components/cabinet/daily-spin"
import { TicketCard } from "@/components/cabinet/ticket-card"
import { PageHeading } from "@/components/account/page-heading"
import { AutoRefresh } from "@/components/auto-refresh"

export default async function PlayPage() {
  await settleLegacyTickets()
  const [balance, tickets, spinStatus] = await Promise.all([getBalance(), getTickets(), getSpinStatus()])

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh intervalMs={20_000} />
      <PageHeading
        eyebrow="Игровой зал"
        title="Игры"
        description="Выбирайте числа, крутите колесо и следите за своими билетами. Результат каждого билета — сразу."
        aside={
          <div className="shrink-0 rounded-2xl bg-card/80 px-4 py-2.5 text-right ring-1 ring-border backdrop-blur">
            <p className="text-[11px] font-medium text-muted-foreground">Баланс</p>
            <p className="font-display text-lg font-extrabold tabular-nums text-foreground">
              {balance.toLocaleString("ru-RU")} <span className="text-sm text-primary">BYN</span>
            </p>
          </div>
        }
      />

      <section id="buy" className="scroll-mt-24">
        <BuyTicketPanel balance={balance} />
      </section>

      <section id="spin" className="scroll-mt-24">
        <DailySpin spunToday={spinStatus.spunToday} todaySegment={spinStatus.todaySegment} todayAmount={spinStatus.todayAmount} />
      </section>

      <section className="min-w-0">
        <h2 className="mb-4 font-display text-xl font-extrabold text-foreground">Мои билеты</h2>
        {tickets.length === 0 ? (
          <EmptyState text="Пока нет билетов. Отметьте числа выше — результат увидите сразу." />
        ) : (
          <ul className="flex flex-col gap-3">
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
