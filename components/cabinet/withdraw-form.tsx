"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { requestWithdrawal } from "@/app/actions/funding"
import { WITHDRAWAL_MAX, WITHDRAWAL_MIN } from "@/lib/funding"

type CardOption = { id: number; last4: string; bankName: string | null; isDefault: boolean }

export function WithdrawForm({ cards, balance, hasPending }: { cards: CardOption[]; balance: number; hasPending: boolean }) {
  const [amount, setAmount] = useState("")
  const [cardId, setCardId] = useState(() => String((cards.find((c) => c.isDefault) ?? cards[0])?.id ?? ""))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  if (cards.length === 0) {
    return (
      <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
        Чтобы выводить выигрыши, сначала{" "}
        <Link href="/cabinet/cards" className="font-semibold text-accent underline-offset-4 hover:underline">привяжите карту</Link>.
      </p>
    )
  }

  if (hasPending) {
    return (
      <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
        Заявка на вывод уже в обработке. Новую можно отправить после её завершения.
      </p>
    )
  }

  const max = Math.min(balance, WITHDRAWAL_MAX)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await requestWithdrawal({ amount: Number(amount), cardId: Number(cardId) })
      if (result.ok) {
        setAmount("")
        setMessage({ ok: true, text: "Заявка отправлена. Сумма зарезервирована до решения администратора." })
      } else {
        setMessage({ ok: false, text: result.error })
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-muted p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
          Сумма, BYN
          <input
            type="number"
            inputMode="numeric"
            min={WITHDRAWAL_MIN}
            max={Math.max(max, WITHDRAWAL_MIN)}
            step={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`от ${WITHDRAWAL_MIN}`}
            className="h-11 rounded-xl border border-border bg-card px-3 text-base font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
          Карта
          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="h-11 rounded-xl border border-border bg-card px-3 text-base font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                •••• {c.last4}{c.bankName ? ` · ${c.bankName}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Доступно: {balance.toLocaleString("ru-RU")} BYN. Сумма списывается с баланса сразу и возвращается, если заявку отклонят.
      </p>
      <button
        type="submit"
        disabled={pending || balance < WITHDRAWAL_MIN}
        className="h-11 rounded-full bg-primary text-sm font-extrabold uppercase tracking-wide text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {pending ? "Отправляем…" : "Вывести"}
      </button>
      {message && (
        <p role="status" className={message.ok ? "text-sm text-success" : "text-sm text-destructive"}>
          {message.text}
        </p>
      )}
    </form>
  )
}
