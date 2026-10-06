import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { getBalance } from "@/app/actions/cabinet"
import { getPaymentCards } from "@/app/actions/cards"
import { getFundingRequests } from "@/app/actions/funding"
import { DepositForm } from "@/components/cabinet/deposit-form"
import { WithdrawForm } from "@/components/cabinet/withdraw-form"
import { CryptoWithdrawForm } from "@/components/cabinet/crypto-withdraw-form"
import { WalletMethodPicker } from "@/components/cabinet/wallet-method-picker"
import { Panel } from "@/components/cabinet/panel"
import { TrackView } from "@/components/track-view"
import { CryptoIcon } from "@/components/crypto-icon"
import { isAssetId } from "@/lib/crypto/assets"
import { requireSession } from "@/lib/require-session"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Кошелёк — bytoloto.com" }

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "В обработке", tone: "bg-muted text-muted-foreground" },
  approved: { label: "Выполнено", tone: "bg-success/12 text-success" },
  rejected: { label: "Отклонено", tone: "bg-destructive/10 text-destructive" },
}

const money = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Minsk" })

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ tab?: string; method?: string }> }) {
  await requireSession()
  const [params, balance, cards, requests] = await Promise.all([searchParams, getBalance(), getPaymentCards(), getFundingRequests()])

  const tab = params.tab === "withdraw" ? "withdraw" : "deposit"
  const method = params.method === "card" || params.method === "crypto" ? params.method : null

  const confirmed = cards
    .filter((c) => c.status === "confirmed")
    .map((c) => ({ id: c.id, last4: c.last4, bankName: c.bankName, isDefault: c.isDefault }))
  if (method === "card" && confirmed.length === 0) redirect("/cabinet/cards")
  if (tab === "deposit" && method === "crypto") redirect("/cabinet/deposit/crypto")

  const primary = confirmed.find((c) => c.isDefault) ?? confirmed[0]
  const cardLabel = primary ? `${primary.bankName ?? "Карта"} •••• ${primary.last4}` : null
  const type = tab === "deposit" ? "deposit" : "withdrawal"
  const history = requests.filter((r) => r.type === type)
  const hasPending = history.some((r) => r.status === "pending")
  const base = tab === "withdraw" ? "/cabinet/deposit?tab=withdraw&method=" : "/cabinet/deposit?method="

  return (
    <div className="flex flex-col gap-5">
      {tab === "deposit" && <TrackView goal="deposit_view" />}
      <section className="relative overflow-hidden rounded-3xl bg-foreground p-6 text-background sm:p-8">
        <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-background/60">Игровой баланс</p>
        <p className="relative mt-2 flex items-baseline gap-2 font-display text-5xl font-extrabold tracking-tight tabular-nums sm:text-6xl">
          {money.format(balance)}
          <span className="text-2xl text-primary">BYN</span>
        </p>
        <p className="relative mt-2 text-sm text-background/70">Пополнения и выводы картой или криптовалютой. Баланс всегда в BYN.</p>
      </section>

      <div role="tablist" aria-label="Операция" className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-1 ring-1 ring-border">
        <TabLink href="/cabinet/deposit" active={tab === "deposit"} icon={<ArrowDownToLine className="size-4" />}>
          Пополнение
        </TabLink>
        <TabLink href="/cabinet/deposit?tab=withdraw" active={tab === "withdraw"} icon={<ArrowUpFromLine className="size-4" />}>
          Вывод
        </TabLink>
      </div>

      <WalletMethodPicker
        active={method}
        hasCard={confirmed.length > 0}
        cardLabel={cardLabel}
        cardHref={confirmed.length > 0 ? `${base}card` : "/cabinet/cards"}
        cryptoHref={tab === "deposit" ? "/cabinet/deposit/crypto" : `${base}crypto`}
        cryptoHint={tab === "deposit" ? "Зачисление автоматически" : "На ваш кошелёк"}
      />

      {method === "card" && (
        <Panel className="p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-extrabold text-foreground">
            {tab === "deposit" ? "Пополнение картой" : "Вывод на карту"}
          </h2>
          {tab === "deposit" ? (
            <DepositForm cards={confirmed} hasPending={hasPending} />
          ) : (
            <WithdrawForm cards={confirmed} balance={balance} hasPending={hasPending} />
          )}
        </Panel>
      )}

      {tab === "withdraw" && method === "crypto" && (
        <Panel className="p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-extrabold text-foreground">Вывод в криптовалюте</h2>
          <CryptoWithdrawForm balance={balance} hasPending={hasPending} />
        </Panel>
      )}

      {!method && (
        <p className="px-1 text-center text-sm text-muted-foreground">
          {tab === "deposit" ? "Выберите способ пополнения" : "Выберите, куда вывести средства. Заявки подтверждаются вручную."}
        </p>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-extrabold text-foreground">
            {tab === "deposit" ? "История пополнений" : "История выводов"}
          </h2>
          <ul className="flex flex-col gap-2">
            {history.map((r) => {
              const status = STATUS[r.status] ?? { label: r.status, tone: "bg-muted text-muted-foreground" }
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
                  {r.asset && isAssetId(r.asset) ? (
                    <CryptoIcon asset={r.asset} size={32} />
                  ) : (
                    <span className="grid size-8 place-items-center rounded-full bg-accent/12 text-accent">
                      {tab === "deposit" ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold tabular-nums text-foreground">
                      {tab === "deposit" ? "+" : "−"}
                      {r.amount.toLocaleString("ru-RU")} BYN
                    </span>
                    <span className="block text-xs text-muted-foreground">{dateFmt.format(r.createdAt)}</span>
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.tone)}>{status.label}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function TabLink({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      scroll={false}
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors",
        active ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </Link>
  )
}
