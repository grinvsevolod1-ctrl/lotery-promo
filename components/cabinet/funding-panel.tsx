"use client"

import { useState, useTransition } from "react"
import { requestDeposit, requestWithdrawal } from "@/app/actions/funding"
import type { FundingRequestRow } from "@/app/actions/funding"
import type { PaymentCardView } from "@/app/actions/cards"
import { maskCard } from "@/lib/payment-cards"
import { ArrowDownMark, ArrowUpMark, ClockMark } from "@/components/icons"
import { Panel } from "@/components/cabinet/panel"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает подтверждения",
  approved: "Выполнено",
  rejected: "Отклонено",
}

const STATUS_CLASS: Record<string, string> = {
  pending: "text-gold",
  approved: "text-primary",
  rejected: "text-destructive",
}

export function FundingPanel({
  cards,
  requests,
}: {
  cards: PaymentCardView[]
  requests: FundingRequestRow[]
}) {
  const confirmedCards = cards.filter((c) => c.status === "confirmed")
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null)

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-extrabold text-foreground">Пополнение и вывод</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "deposit" ? null : "deposit")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition",
              mode === "deposit" ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground hover:bg-foreground/15",
            )}
          >
            <ArrowDownMark className="size-4" />
            Пополнить
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "withdraw" ? null : "withdraw")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition",
              mode === "withdraw" ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground hover:bg-foreground/15",
            )}
          >
            <ArrowUpMark className="size-4" />
            Вывести
          </button>
        </div>
      </div>

      {mode && (
        <FundingForm
          mode={mode}
          cards={confirmedCards}
          onDone={() => setMode(null)}
        />
      )}

      {requests.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-4">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-foreground/85">
                {r.type === "deposit" ? (
                  <ArrowDownMark className="size-4 text-foreground/50" />
                ) : (
                  <ArrowUpMark className="size-4 text-foreground/50" />
                )}
                {r.type === "deposit" ? "Пополнение" : "Вывод"} {r.amount} BYN
              </span>
              <span className={cn("flex items-center gap-1 text-xs font-medium", STATUS_CLASS[r.status])}>
                {r.status === "pending" && <ClockMark className="size-3.5" />}
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function FundingForm({
  mode,
  cards,
  onDone,
}: {
  mode: "deposit" | "withdraw"
  cards: PaymentCardView[]
  onDone: () => void
}) {
  const [cardId, setCardId] = useState(String(cards[0]?.id ?? ""))
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  if (cards.length === 0) {
    return (
      <p className="mt-4 rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        Сначала привяжите и дождитесь подтверждения карты в разделе{" "}
        <a href="/cabinet/cards" className="text-primary underline">
          «Мои карты»
        </a>
        .
      </p>
    )
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const action = mode === "deposit" ? requestDeposit : requestWithdrawal
      const result = await action(Number(cardId), amount)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setAmount("")
      setTimeout(onDone, 1200)
    })
  }

  if (success) {
    return (
      <p className="mt-4 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
        Заявка отправлена. Мы подтвердим её вручную в ближайшее время.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
      <select
        value={cardId}
        onChange={(e) => setCardId(e.target.value)}
        className="h-12 rounded-2xl border border-border bg-background/60 px-4 text-sm text-foreground outline-none focus:border-primary"
      >
        {cards.map((c) => (
          <option key={c.id} value={c.id}>
            {maskCard(c.last4)}
          </option>
        ))}
      </select>
      <input
        inputMode="numeric"
        placeholder="Сумма, BYN"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
        className="h-12 flex-1 rounded-2xl border border-border bg-background/60 px-4 text-sm text-foreground outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={pending || !amount}
        className="h-12 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition disabled:opacity-50"
      >
        {pending ? "Отправка…" : mode === "deposit" ? "Пополнить" : "Вывести"}
      </button>
      {error && <p className="text-sm text-destructive sm:basis-full">{error}</p>}
    </form>
  )
}
