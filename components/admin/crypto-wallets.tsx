"use client"

import { useState, useTransition } from "react"
import { adminCheckCrypto, saveCryptoWallets } from "@/app/actions/crypto"
import { ASSETS, ASSET_IDS } from "@/lib/crypto/assets"

type RecentInvoice = { id: number; asset: string; cryptoAmount: string; amountByn: number; status: string; createdAt: string; txHash: string | null }

export function CryptoWallets({ wallets, recent }: { wallets: Record<string, string>; recent: RecentInvoice[] }) {
  const [values, setValues] = useState<Record<string, string>>(wallets)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-xl font-extrabold text-foreground">Криптокошельки</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Один адрес на валюту для всех игроков. Платёж определяется по уникальной сумме заявки (30 минут). Пустое поле — валюта скрыта.
      </p>

      <form
        className="mt-5 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setMessage(null)
          startTransition(async () => {
            const result = await saveCryptoWallets(values)
            setMessage(result.ok ? "Сохранено" : result.error)
          })
        }}
      >
        {ASSET_IDS.map((id) => (
          <label key={id} className="flex flex-col gap-1">
            <span className="text-xs font-bold text-muted-foreground">
              {ASSETS[id].symbol} · {ASSETS[id].network}
            </span>
            <input
              value={values[id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [id]: e.target.value }))}
              spellCheck={false}
              autoComplete="off"
              className="h-11 rounded-xl bg-background px-3 font-mono text-sm text-foreground ring-1 ring-border outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        ))}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            Сохранить
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const credited = await adminCheckCrypto()
                setMessage(`Проверено. Зачислено заявок: ${credited}`)
              })
            }
            className="h-11 rounded-xl bg-muted px-5 text-sm font-bold text-foreground disabled:opacity-50"
          >
            Проверить платежи сейчас
          </button>
          {message && <span className="text-sm font-semibold text-foreground" role="status">{message}</span>}
        </div>
      </form>

      {recent.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold text-foreground">Последние заявки</h3>
          <ul className="flex flex-col divide-y divide-border text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="tabular-nums text-foreground">
                  #{r.id} · {r.cryptoAmount} {ASSETS[r.asset as keyof typeof ASSETS]?.symbol ?? r.asset} · {r.amountByn.toFixed(2)} BYN
                </span>
                <span className={r.status === "paid" ? "font-semibold text-primary" : "text-muted-foreground"}>{r.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
