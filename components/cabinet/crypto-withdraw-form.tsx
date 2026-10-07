"use client"

import Link from "next/link"
import { useCallback, useState, useTransition } from "react"
import { WithdrawSuccess } from "@/components/cabinet/withdraw-success"
import { track } from "@/lib/analytics"
import { useRouter } from "next/navigation"
import { TriangleAlert } from "lucide-react"
import { requestCryptoWithdrawal } from "@/app/actions/funding"
import { ASSET_IDS, ASSETS, type AssetId } from "@/lib/crypto/assets"
import { WITHDRAWAL_MAX, WITHDRAWAL_MIN } from "@/lib/funding"
import { CryptoIcon } from "@/components/crypto-icon"
import { fieldClass } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function CryptoWithdrawForm({ balance, hasPending, blockedReason = null }: { balance: number; hasPending: boolean; blockedReason?: string | null }) {
  const router = useRouter()
  const [asset, setAsset] = useState<AssetId>("USDT_TRC20")
  const [wallet, setWallet] = useState("")
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState<{ amount: number; destination: string } | null>(null)
  const closeSuccess = useCallback(() => {
    setSuccess(null)
    router.refresh()
  }, [router])

  if (success) return <WithdrawSuccess {...success} onClose={closeSuccess} />

  if (blockedReason) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl bg-muted p-4 text-sm leading-relaxed text-foreground">
        <p>{blockedReason}</p>
        <Link href="/cabinet/deposit" className="font-semibold text-accent underline-offset-4 hover:underline">Перейти к пополнению</Link>
      </div>
    )
  }

  if (hasPending) {
    return (
      <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
        Заявка на вывод уже в обработке. Новую можно отправить после её завершения.
      </p>
    )
  }

  const max = Math.floor(Math.min(balance, WITHDRAWAL_MAX))
  const info = ASSETS[asset]

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await requestCryptoWithdrawal({ amount: Number(amount), asset, wallet })
      if (result.ok) {
        setSuccess({ amount: Number(amount), destination: `кошелёк ${ASSETS[asset].symbol}` })
        setAmount("")
        setWallet("")
        track("withdraw_request")
      } else {
        setMessage({ ok: false, text: result.error })
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-foreground">Криптовалюта и сеть</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ASSET_IDS.map((id) => {
            const a = ASSETS[id]
            const selected = id === asset
            return (
              <label
                key={id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-2xl p-2.5 ring-1 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  selected ? "bg-primary/8 ring-2 ring-primary" : "bg-muted/60 ring-transparent hover:ring-border",
                )}
              >
                <input type="radio" name="asset" value={id} checked={selected} onChange={() => setAsset(id)} className="sr-only" />
                <CryptoIcon asset={id} size={30} />
                <span className="min-w-0 leading-tight">
                  <span className="block text-sm font-extrabold text-foreground">{a.symbol}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{a.network}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
        Адрес кошелька {info.symbol}
        <input
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          maxLength={128}
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder={`Ваш адрес в сети ${info.network}`}
          className={cn(fieldClass, "font-mono text-sm font-normal")}
        />
        <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          {info.warning}
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="crypto-withdraw-amount" className="text-sm font-semibold text-foreground">Сумма, BYN</label>
        <input
          id="crypto-withdraw-amount"
          type="number"
          inputMode="numeric"
          min={WITHDRAWAL_MIN}
          max={Math.max(max, WITHDRAWAL_MIN)}
          step={1}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`от ${WITHDRAWAL_MIN}`}
          className={cn(fieldClass, "font-normal")}
        />
        <div className="flex gap-2">
          {[0.25, 0.5, 1].map((share) => {
            const value = Math.floor(max * share)
            return (
              <button
                key={share}
                type="button"
                disabled={value < WITHDRAWAL_MIN}
                onClick={() => setAmount(String(value))}
                className="flex-1 rounded-xl bg-muted py-2 text-xs font-bold text-foreground transition active:scale-95 disabled:opacity-40"
              >
                {share === 1 ? "Всё" : `${share * 100}%`}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Доступно {balance.toLocaleString("ru-RU")} BYN. Сумма резервируется сразу, пересчитывается в {info.symbol} по курсу на момент
        отправки и возвращается на баланс, если заявку отклонят.
      </p>

      <button
        type="submit"
        disabled={pending || max < WITHDRAWAL_MIN}
        className="h-13 rounded-2xl bg-primary text-[17px] font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-[transform,opacity] duration-200 active:scale-[0.97] disabled:opacity-50"
      >
        {pending ? "Отправляем…" : "Вывести"}
      </button>
      {message && (
        <p role="status" className={message.ok ? "text-sm font-medium text-success" : "text-sm text-destructive"}>
          {message.text}
        </p>
      )}
    </form>
  )
}
