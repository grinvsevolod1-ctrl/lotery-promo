"use client"

import Link from "next/link"
import { useState, useTransition, type FormEvent } from "react"
import { requestDeposit } from "@/app/actions/funding"
import { track } from "@/lib/analytics"
import { DEPOSIT_MAX, DEPOSIT_MIN, DEPOSIT_PRESETS } from "@/lib/funding"
import { fieldClass } from "@/components/ui/input"
import { DepositCodeStep } from "@/components/cabinet/deposit-code-step"
import { actionErrorMessage } from "@/lib/action-error"
import { cn } from "@/lib/utils"

type CardOption = { id: number; last4: string; bankName: string | null; isDefault: boolean }

export function DepositForm({ cards, hasPending }: { cards: CardOption[]; hasPending: boolean }) {
  const [amount, setAmount] = useState<string>(String(DEPOSIT_PRESETS[1]))
  const [cardId, setCardId] = useState(() => String((cards.find((c) => c.isDefault) ?? cards[0])?.id ?? ""))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [active, setActive] = useState<{ id: number; amount: number } | null>(null)

  if (active) {
    return <DepositCodeStep requestId={active.id} amount={active.amount} onClose={() => setActive(null)} />
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-3xl bg-muted p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Пополнение доступно с подтверждённой карты. Привяжите карту — это займёт пару минут.
        </p>
        <Link
          href="/cabinet/cards"
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition active:scale-[0.97]"
        >
          Привязать карту
        </Link>
      </div>
    )
  }

  const numeric = Number(amount)
  const valid = Number.isInteger(numeric) && numeric >= DEPOSIT_MIN && numeric <= DEPOSIT_MAX

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await requestDeposit({ amount: numeric, cardId: Number(cardId) })
        if (result.ok) {
          track("deposit_request", { method: "card", amount: numeric })
          setActive({ id: result.id, amount: numeric })
        } else {
          setMessage({ ok: false, text: result.error })
        }
      } catch (e) {
        setMessage({ ok: false, text: actionErrorMessage(e, "Не удалось отправить заявку. Попробуйте ещё раз.") })
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-foreground">Сумма, BYN</legend>
        <div className="grid grid-cols-4 gap-2">
          {DEPOSIT_PRESETS.map((preset) => {
            const active = amount === String(preset)
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                aria-pressed={active}
                className={cn(
                  "h-12 rounded-2xl text-base font-bold tabular-nums transition active:scale-[0.96]",
                  active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-muted text-foreground hover:bg-muted/70",
                )}
              >
                {preset}
              </button>
            )
          })}
        </div>
        <label className="sr-only" htmlFor="deposit-amount">Другая сумма</label>
        <input
          id="deposit-amount"
          type="number"
          inputMode="numeric"
          min={DEPOSIT_MIN}
          max={DEPOSIT_MAX}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Другая сумма: от ${DEPOSIT_MIN} до ${DEPOSIT_MAX}`}
          className={cn(fieldClass, "tabular-nums")}
        />
      </fieldset>

      <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
        Карта списания
        <select value={cardId} onChange={(e) => setCardId(e.target.value)} className={cn(fieldClass, "font-normal")}>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              •••• {c.last4}{c.bankName ? ` · ${c.bankName}` : ""}
            </option>
          ))}
        </select>
      </label>

      {hasPending && (
        <p className="rounded-2xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          У вас есть заявка в обработке. Можно отправить ещё одну — обе будут рассмотрены.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !valid}
        className="h-14 rounded-full bg-primary text-[17px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Отправляем…" : valid ? `Пополнить на ${numeric.toLocaleString("ru-RU")} BYN` : "Пополнить"}
      </button>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={cn("rounded-2xl p-3 text-sm leading-relaxed", message.ok ? "bg-primary/10 text-foreground" : "bg-destructive/10 text-destructive")}>
          {message.text}
        </p>
      )}
    </form>
  )
}
