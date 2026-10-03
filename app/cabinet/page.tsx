import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getBalance, getSpinStatus, getTickets, getTransactions } from "@/app/actions/cabinet"
import { getNextDraw, settleDueDraws } from "@/lib/draws"
import { TicketMark, TrophyMark, UserMark, WalletMark } from "@/components/icons"
import { EmptyState, StatCard } from "@/components/cabinet/panel"
import { WelcomeBonusCard } from "@/components/cabinet/welcome-bonus-card"
import { NextDrawCard } from "@/components/cabinet/next-draw-card"
import { DailySpin } from "@/components/cabinet/daily-spin"
import { BuyTicketPanel } from "@/components/cabinet/buy-ticket-panel"
import { TicketCard } from "@/components/cabinet/ticket-card"
import { TransactionsList } from "@/components/cabinet/transactions-list"

export default async function CabinetPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  // Fallback for the scheduler: settle anything overdue before rendering.
  await settleDueDraws()

  const [balance, tickets, transactions, spinStatus, nextDraw] = await Promise.all([
    getBalance(),
    getTickets(),
    getTransactions(),
    getSpinStatus(),
    getNextDraw(),
  ])

  const hasWelcome = transactions.some((t) => t.type === "welcome")
  const wins = tickets.filter((t) => t.status === "win").length
  const pendingForNext = tickets.filter((t) => t.drawId === nextDraw.id).length
  const firstName = session.user.name.split(" ")[0] || "игрок"

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
          <UserMark className="size-7" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Привет, {firstName}!
          </h1>
          <p className="truncate text-sm text-muted-foreground">{session.user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<WalletMark className="size-6" />} label="Баланс бонусов" value={`${balance} BYN`} accent />
        <StatCard icon={<TicketMark className="size-6" />} label="Всего билетов" value={String(tickets.length)} />
        <StatCard icon={<TrophyMark className="size-6" />} label="Выигрышей" value={String(wins)} />
      </div>

      {!hasWelcome && <WelcomeBonusCard />}

      <div className="grid gap-6 lg:grid-cols-2">
        <NextDrawCard drawId={nextDraw.id} drawAt={nextDraw.drawAt} pendingTickets={pendingForNext} />
        <div id="spin" className="scroll-mt-24">
          <DailySpin
            spunToday={spinStatus.spunToday}
            todaySegment={spinStatus.todaySegment}
            todayAmount={spinStatus.todayAmount}
          />
        </div>
      </div>

      <BuyTicketPanel balance={balance} drawAt={nextDraw.drawAt.toISOString()} drawId={nextDraw.id} />

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section className="min-w-0">
          <h2 className="mb-4 font-display text-xl font-extrabold text-foreground">Мои билеты</h2>
          {tickets.length === 0 ? (
            <EmptyState text="Пока нет билетов. Соберите первую комбинацию выше!" />
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
