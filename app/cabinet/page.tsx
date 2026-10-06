import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getBalance, getTickets, getTransactions } from "@/app/actions/cabinet"
import { getPaymentCards } from "@/app/actions/cards"
import { settleLegacyTickets } from "@/lib/draws"
import { ArrowRight as ArrowRightMark, Ticket as TicketMark, Trophy as TrophyMark, Wallet as WalletMark } from "lucide-react"
import { Panel } from "@/components/cabinet/panel"
import { TransactionsList } from "@/components/cabinet/transactions-list"
import { ReferralPanel } from "@/components/cabinet/referral-panel"
import { AutoRefresh } from "@/components/auto-refresh"

export default async function CabinetPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  await settleLegacyTickets()

  const [balance, tickets, transactions, cards] = await Promise.all([
    getBalance(),
    getTickets(),
    getTransactions(),
    getPaymentCards(),
  ])

  const hasWelcome = transactions.some((t) => t.type === "welcome")
  const wins = tickets.filter((t) => t.status === "win")
  const totalWon = wins.reduce((sum, t) => sum + t.prize, 0)
  const firstName = session?.user.name.split(" ")[0] || "игрок"
  const confirmedCards = cards.filter((c) => c.status === "confirmed").length

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={20_000} />

      <Panel accent className="p-6 sm:p-8">
        <p className="text-sm text-muted-foreground">Привет, {firstName}!</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Игровой баланс</p>
        <p className="mt-1 flex items-baseline gap-2 font-display text-5xl font-extrabold tracking-tight tabular-nums text-foreground sm:text-6xl">
          {balance.toLocaleString("ru-RU")}
          <span className="text-2xl text-primary">BYN</span>
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/play"
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.97]"
          >
            <TicketMark className="size-5" />
            Играть
          </Link>
          <Link
            href="/cabinet/deposit"
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-card text-base font-semibold text-foreground ring-1 ring-border transition active:scale-[0.97]"
          >
            <WalletMark className="size-5" />
            Пополнить
          </Link>
        </div>
      </Panel>

      <div className="grid grid-cols-3 gap-3">
        <Stat href="/play/tickets" label="Билетов" value={tickets.length.toLocaleString("ru-RU")} icon={<TicketMark className="size-5" />} />
        <Stat href="/cabinet/wins" label="Выиграно, BYN" value={totalWon.toLocaleString("ru-RU")} icon={<TrophyMark className="size-5" />} />
        <Stat href="/cabinet/cards" label="Карт" value={String(confirmedCards)} icon={<WalletMark className="size-5" />} />
      </div>

      {!hasWelcome && (
        <Link
          href="/cabinet/bonuses"
          className="flex items-center justify-between gap-4 rounded-3xl bg-foreground p-5 text-background ring-2 ring-primary transition active:scale-[0.98]"
        >
          <span>
            <span className="block font-display text-lg font-extrabold">Приветственный бонус ждёт вас</span>
            <span className="block text-sm text-background/70">Заберите его в разделе «Бонусы»</span>
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <ArrowRightMark className="size-4" />
          </span>
        </Link>
      )}

      <section id="referral" className="scroll-mt-24">
        <ReferralPanel />
      </section>

      <section className="min-w-0">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-foreground">История баланса</h2>
        </div>
        <TransactionsList transactions={transactions} />
      </section>
    </div>
  )
}

function Stat({ href, label, value, icon }: { href: string; label: string; value: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-3xl bg-card p-4 ring-1 ring-border transition active:scale-[0.97]"
    >
      <span className="flex items-center justify-between text-primary">
        {icon}
        <ArrowRightMark className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
      <span>
        <span className="block font-display text-xl font-extrabold tabular-nums text-foreground">{value}</span>
        <span className="block text-balance text-[11px] leading-tight text-muted-foreground">{label}</span>
      </span>
    </Link>
  )
}
