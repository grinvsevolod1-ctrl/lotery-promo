import type { Metadata } from "next"
import Link from "next/link"
import { getBalance } from "@/app/actions/cabinet"
import { getCryptoRates } from "@/app/actions/crypto"
import { PageHeading } from "@/components/account/page-heading"
import { CryptoDeposit } from "@/components/cabinet/crypto-deposit"
import { Panel } from "@/components/cabinet/panel"
import { ASSETS, ASSET_IDS, type AssetId } from "@/lib/crypto/assets"
import { getUserInvoices, getWallets } from "@/lib/crypto/deposits"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: "Пополнение криптовалютой — bytoloto.com" }

const STATUS: Record<string, string> = { pending: "Ожидает оплаты", paid: "Зачислено", expired: "Истекла", cancelled: "Отменена" }

export default async function CryptoDepositPage() {
  const session = await requireSession()
  const [balance, wallets, rates, invoices] = await Promise.all([
    getBalance(),
    getWallets(),
    getCryptoRates(),
    getUserInvoices(session.user.id),
  ])
  const available = ASSET_IDS.filter((id): id is AssetId => Boolean(wallets[id]))
  const active = invoices.find((i) => i.status === "pending" && new Date(i.expiresAt).getTime() > Date.now()) ?? null

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={`Баланс: ${balance.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BYN`}
        title="Пополнение криптовалютой"
        description="Укажите сумму в BYN — мы пересчитаем её по текущему курсу. Баланс зачисляется в BYN автоматически после поступления перевода."
        aside={
          <Link href="/cabinet/deposit" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Картой
          </Link>
        }
      />
      <Panel className="p-5 sm:p-6">
        <CryptoDeposit available={available} rates={rates} initialInvoice={active} />
      </Panel>

      {invoices.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-foreground">История криптопополнений</h2>
          <ul className="flex flex-col gap-2">
            {invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
                <span className="min-w-0">
                  <span className="block text-sm font-bold tabular-nums text-foreground">
                    {i.cryptoAmount} {ASSETS[i.asset].symbol}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(i.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                    {i.amountByn.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} BYN
                  </span>
                </span>
                <span className={i.status === "paid" ? "text-xs font-semibold text-primary" : "text-xs text-muted-foreground"}>
                  {STATUS[i.status] ?? i.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
