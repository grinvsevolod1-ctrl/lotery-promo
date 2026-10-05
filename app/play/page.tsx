import { getBalance, getSpinStatus, getTickets } from "@/app/actions/cabinet"
import { settleLegacyTickets } from "@/lib/draws"
import { PageHeading } from "@/components/account/page-heading"
import { BalanceBadge } from "@/components/play/balance-badge"
import { GameCard } from "@/components/play/game-card"
import { CloverMark, TicketMark, TrophyMark } from "@/components/icons"
import { requireSession } from "@/lib/require-session"

export default async function PlayPage() {
  await requireSession()
  await settleLegacyTickets()
  const [balance, tickets, spinStatus] = await Promise.all([getBalance(), getTickets(), getSpinStatus()])

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Игровой зал"
        title="Игры"
        description="Выберите игру — каждая открывается на отдельной странице."
        aside={<BalanceBadge balance={balance} />}
      />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GameCard
          href="/play/lottery"
          title="Моментальная лотерея"
          description="Отметьте числа на билете — результат сразу после покупки."
          icon={<TicketMark className="size-6" />}
          status="Доступна"
          accent
        />
        <GameCard
          href="/play/wheel"
          title="Колесо удачи"
          description="Один бесплатный прокрут в день с гарантированным призом."
          icon={<CloverMark className="size-6" />}
          status={spinStatus.spunToday ? "Завтра снова" : "Прокрут доступен"}
        />
        <GameCard
          href="/play/tickets"
          title="Мои билеты"
          description="История всех купленных билетов и их результаты."
          icon={<TrophyMark className="size-6" />}
          status={`${tickets.length.toLocaleString("ru-RU")} шт.`}
        />
      </ul>
    </div>
  )
}
