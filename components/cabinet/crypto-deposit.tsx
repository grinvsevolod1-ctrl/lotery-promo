"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { QRCodeSVG } from "qrcode.react"
import { cancelCryptoInvoice, createCryptoInvoice, pollCryptoInvoice } from "@/app/actions/crypto"
import { ASSETS, MAX_DEPOSIT_BYN, MIN_DEPOSIT_BYN, type AssetId } from "@/lib/crypto/assets"
import type { InvoiceView } from "@/lib/crypto/deposits"
import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics"
import { CryptoIcon } from "@/components/crypto-icon"

const PRESETS = [20, 50, 100, 300, 500]

function formatByn(value: number) {
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CryptoDeposit({
  available,
  rates,
  initialInvoice,
}: {
  available: AssetId[]
  rates: Record<string, number> | null
  initialInvoice: InvoiceView | null
}) {
  const [invoice, setInvoice] = useState<InvoiceView | null>(initialInvoice)

  if (available.length === 0) {
    return <p className="text-sm leading-relaxed text-muted-foreground">Пополнение криптовалютой временно недоступно. Попробуйте позже.</p>
  }

  return invoice ? (
    <InvoiceScreen invoice={invoice} onClose={() => setInvoice(null)} />
  ) : (
    <InvoiceForm available={available} rates={rates} onCreated={setInvoice} />
  )
}

function InvoiceForm({
  available,
  rates,
  onCreated,
}: {
  available: AssetId[]
  rates: Record<string, number> | null
  onCreated: (invoice: InvoiceView) => void
}) {
  const [asset, setAsset] = useState<AssetId>(available[0])
  const [amount, setAmount] = useState("100")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const value = Number(amount.replace(",", "."))
  const valid = Number.isFinite(value) && value >= MIN_DEPOSIT_BYN && value <= MAX_DEPOSIT_BYN
  const rate = rates?.[asset]
  const info = ASSETS[asset]
  const approx = valid && rate ? (value / rate).toFixed(info.precision) : null

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await createCryptoInvoice(asset, value)
      if (result.ok) {
        track("crypto_invoice", { asset })
        onCreated(result.invoice)
      }
      else setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-bold text-foreground">Валюта и сеть</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {available.map((id) => {
            const a = ASSETS[id]
            const selected = id === asset
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAsset(id)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-left ring-1 transition-colors",
                  selected ? "bg-primary/10 ring-2 ring-primary" : "bg-background ring-border hover:ring-foreground/30",
                )}
              >
                <CryptoIcon asset={id} size={36} />
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-foreground">{a.symbol}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.network}</span>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <label htmlFor="crypto-amount" className="text-sm font-bold text-foreground">
          Сумма пополнения, BYN
        </label>
        <div className="flex items-center gap-2 rounded-2xl bg-background px-4 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
          <input
            id="crypto-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            className="h-14 min-w-0 flex-1 bg-transparent text-2xl font-extrabold tabular-nums text-foreground outline-none"
          />
          <span className="text-sm font-bold text-muted-foreground">BYN</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold ring-1 transition-colors",
                value === p ? "bg-foreground text-background ring-foreground" : "bg-background text-foreground ring-border hover:ring-foreground/40",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {approx ? (
            <>
              {"К оплате примерно "}
              <span className="font-bold tabular-nums text-foreground">
                {approx} {info.symbol}
              </span>
              {rate ? ` · 1 ${info.symbol} = ${formatByn(rate)} BYN` : null}
            </>
          ) : valid ? (
            "Курс загружается…"
          ) : (
            `От ${MIN_DEPOSIT_BYN} до ${MAX_DEPOSIT_BYN.toLocaleString("ru-RU")} BYN`
          )}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!valid || pending}
        onClick={submit}
        className="h-14 rounded-2xl bg-primary text-base font-extrabold text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {pending ? "Создаём заявку…" : "Получить реквизиты"}
      </button>
    </div>
  )
}

function useCountdown(expiresAt: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const left = Math.max(0, new Date(expiresAt).getTime() - now)
  const mm = String(Math.floor(left / 60000)).padStart(2, "0")
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0")
  return { left, label: `${mm}:${ss}` }
}

function CopyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="flex items-center justify-between gap-3 rounded-2xl bg-background px-4 py-3 text-left ring-1 ring-border hover:ring-foreground/30"
      >
        <span className={cn("min-w-0 break-all text-foreground", mono ? "font-mono text-sm" : "text-lg font-extrabold tabular-nums")}>
          {value}
        </span>
        <span className="shrink-0 text-xs font-bold text-primary">{copied ? "Скопировано" : "Копировать"}</span>
      </button>
    </div>
  )
}

function InvoiceScreen({ invoice: initial, onClose }: { invoice: InvoiceView; onClose: () => void }) {
  const router = useRouter()
  const [cancelling, startCancel] = useTransition()
  const { data } = useSWR(["crypto-invoice", initial.id], () => pollCryptoInvoice(initial.id), {
    fallbackData: initial,
    refreshInterval: (latest) => (latest?.status === "pending" ? 10_000 : 0),
    revalidateOnMount: true,
  })
  const invoice = data ?? initial
  const info = ASSETS[invoice.asset]
  const { left, label } = useCountdown(invoice.expiresAt)

  useEffect(() => {
    if (invoice.status === "paid") router.refresh()
  }, [invoice.status, router])

  if (invoice.status === "paid") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary text-3xl font-black text-primary-foreground" aria-hidden>
          {"✓"}
        </span>
        <h2 className="font-display text-2xl font-extrabold text-foreground">Баланс пополнен</h2>
        <p className="text-sm text-muted-foreground">
          {"Зачислено "}
          <span className="font-bold tabular-nums text-foreground">{formatByn(invoice.amountByn)} BYN</span>
        </p>
        <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-foreground px-6 text-sm font-bold text-background">
          Готово
        </button>
      </div>
    )
  }

  if (invoice.status !== "pending") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <h2 className="font-display text-2xl font-extrabold text-foreground">
          {invoice.status === "cancelled" ? "Заявка отменена" : "Время заявки истекло"}
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Если вы уже отправили перевод, напишите в поддержку и укажите хеш транзакции — мы зачислим вручную.
        </p>
        <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground">
          Создать новую заявку
        </button>
      </div>
    )
  }

  const expired = left === 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {info.symbol} · {info.network}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Будет зачислено "}
            <span className="font-bold tabular-nums text-foreground">{formatByn(invoice.amountByn)} BYN</span>
          </p>
        </div>
        <div className={cn("rounded-2xl px-3 py-2 text-center", expired ? "bg-destructive/10" : "bg-muted")}>
          <span className="block text-xs text-muted-foreground">{expired ? "Ждём сеть" : "Осталось"}</span>
          <span className="block font-mono text-lg font-extrabold tabular-nums text-foreground">{label}</span>
        </div>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="self-center rounded-2xl bg-card p-3 ring-1 ring-border sm:self-start">
          <QRCodeSVG value={invoice.address} size={168} marginSize={0} aria-label={`QR-код адреса ${info.symbol}`} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <CopyField label="Точная сумма" value={`${invoice.cryptoAmount} ${info.symbol}`} />
          <CopyField label="Адрес кошелька" value={invoice.address} mono />
        </div>
      </div>

      <ul className="flex flex-col gap-2 rounded-2xl bg-accent/10 px-4 py-3 text-sm leading-relaxed text-foreground">
        <li>
          {"Отправьте "}
          <b>ровно {invoice.cryptoAmount} {info.symbol}</b>
          {" — по последним цифрам суммы мы узнаём ваш платёж."}
        </li>
        <li>{info.warning}. Другие монеты и сети будут потеряны.</li>
        <li>Комиссию сети оплачивает отправитель: сумма должна прийти полностью.</li>
      </ul>

      <div className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
        <span className="relative flex size-2.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Проверяем блокчейн каждые 10 секунд. Страницу можно закрыть — зачисление произойдёт автоматически.
        </p>
      </div>

      <button
        type="button"
        disabled={cancelling}
        onClick={() =>
          startCancel(async () => {
            if (await cancelCryptoInvoice(invoice.id)) onClose()
          })
        }
        className="self-start text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
      >
        Отменить заявку
      </button>
    </div>
  )
}
