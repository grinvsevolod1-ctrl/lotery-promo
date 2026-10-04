import Link from "next/link"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getBalance, getSpinStatus, getTickets, getTransactions } from "@/app/actions/cabinet"
import { settleLegacyTickets } from "@/lib/draws"
import { TicketMark, TrophyMark, WalletMark } from "@/components/icons"
import { EmptyState, Panel } from "@/components/cabinet/panel"
import { WelcomeBonusCard } from "@/components/cabinet/welcome-bonus-card"
import { DailySpin } from "@/components/cabinet/daily-spin"
import { BuyTicketPanel } from "@/components/cabinet/buy-ticket-panel"
import { TicketCard } from "@/components/cabinet/ticket-card"
import { TransactionsList } from "@/components/cabinet/transactions-list"

export default async function CabinetPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  await settleLegacyTickets()

  const [balance, tickets, transactions, spinStatus] = await Promise.all([
    getBalance(),
    getTickets(),
    getTransactions(),
    getSpinStatus(),
  ])

  const hasWelcome = transactions.some((t) => t.type === "welcome")
  const wins = tickets.filter((t) => t.status === "win")
  const totalWon = wins.reduce((sum, t) => sum + t.prize, 0)
  const firstName = session.user.name.split(" ")[0] || "игрок"

  return (
    <div className="flex flex-col gap-8">
      <Panel accent className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Привет, {firstName}! Ваш баланс</p>
            <p className="flex items-baseline gap-2 font-display text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              {balance.toLocaleString("ru-RU")}
              <span className="text-2xl text-gold">BYN</span>
            </p>
            <p className="text-xs text-muted-foreground">Списывается при покупке билета, выигрыш зачисляется сразу</p>
          </div>
          <Link
            href="/cabinet/cards"
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-foreground/10 px-6 text-sm font-semibold text-foreground transition hover:bg-foreground/15"
          >
            <WalletMark className="size-5" />
            Мои карты
          </Link>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-border/60 pt-5">
          <div className="flex items-center gap-3">
            <TicketMark className="size-5 text-foreground/60" />
            <div>
              <dt className="text-xs text-muted-foreground">Сыграно билетов</dt>
              <dd className="font-display text-lg font-extrabold text-foreground">{tickets.length}</dd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TrophyMark className="size-5 text-gold" />
            <div>
              <dt className="text-xs text-muted-foreground">Выиграно</dt>
              <dd className="font-display text-lg font-extrabold text-foreground">
                {totalWon.toLocaleString("ru-RU")} BYN · {wins.length}
              </dd>
            </div>
          </div>
        </dl>
      </Panel>

      {!hasWelcome && <WelcomeBonusCard />}

      <BuyTicketPanel balance={balance} />

      <div id="spin" className="scroll-mt-24">
        <DailySpin spunToday={spinStatus.spunToday} todaySegment={spinStatus.todaySegment} todayAmount={spinStatus.todayAmount} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
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

        <section className="min-w-0">
          <h2 className="mb-4 font-display text-xl font-extrabold text-foreground">История баланса</h2>
          <TransactionsList transactions={transactions} />
        </section>
      </div>
    </div>
  )
}
