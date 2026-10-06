import type { Metadata } from "next"
import Link from "next/link"
import { getBalance } from "@/app/actions/cabinet"
import { getPaymentCards } from "@/app/actions/cards"
import { getFundingRequests } from "@/app/actions/funding"
import { PageHeading } from "@/components/account/page-heading"
import { DepositForm } from "@/components/cabinet/deposit-form"
import { Panel } from "@/components/cabinet/panel"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: "Пополнение — bytoloto.com" }

const STATUS_LABEL: Record<string, string> = { pending: "В обработке", approved: "Зачислено", rejected: "Отклонено" }

export default async function DepositPage() {
  await requireSession()
  const [balance, cards, requests] = await Promise.all([getBalance(), getPaymentCards(), getFundingRequests()])
  const confirmed = cards
    .filter((c) => c.status === "confirmed")
    .map((c) => ({ id: c.id, last4: c.last4, bankName: c.bankName, isDefault: c.isDefault }))
  const deposits = requests.filter((r) => r.type === "deposit")

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={`Баланс: ${balance.toLocaleString("ru-RU")} BYN`}
        title="Пополнение"
        description="Выберите сумму и карту. После подтверждения оплаты деньги сразу появятся на игровом балансе."
      />
      <Link
        href="/cabinet/deposit/crypto"
        className="flex items-center justify-between gap-4 rounded-3xl bg-foreground px-5 py-4 text-background transition-opacity hover:opacity-90"
      >
        <span className="min-w-0">
          <span className="block font-display text-lg font-extrabold">Пополнить криптовалютой</span>
          <span className="block text-sm opacity-70">USDT, BTC, ETH, TON, TRX, LTC, USDC · зачисление автоматически</span>
        </span>
        <span className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Открыть</span>
      </Link>
      <Panel className="p-5 sm:p-6">
        <DepositForm cards={confirmed} hasPending={deposits.some((d) => d.status === "pending")} />
      </Panel>

      {deposits.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-foreground">История пополнений</h2>
          <ul className="flex flex-col gap-2">
            {deposits.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
                <span className="text-sm font-bold tabular-nums text-foreground">+{d.amount.toLocaleString("ru-RU")} BYN</span>
                <span className={d.status === "approved" ? "text-xs font-semibold text-primary" : "text-xs text-muted-foreground"}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
