"use client"

import { useState, useTransition } from "react"
import { buyScratchCard, type ScratchResult } from "@/app/actions/games"
import { Notice } from "@/components/cabinet/panel"
import { ScratchField } from "@/components/games/scratch/scratch-field"
import { ScratchSymbolBadge } from "@/components/games/scratch/scratch-symbol"
import {
  SCRATCH_FIELDS,
  SCRATCH_GAME_NAME,
  SCRATCH_PRICES,
  SCRATCH_SYMBOL_LABELS,
  SCRATCH_TIERS,
  type ScratchPrice,
} from "@/lib/games/scratch"
import { cn } from "@/lib/utils"

type Card = ScratchResult & { ticketId: number; price: number }

export function ScratchGame({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance)
  const [price, setPrice] = useState<ScratchPrice>(1)
  const [card, setCard] = useState<Card | null>(null)
  const [revealed, setRevealed] = useState<boolean[]>(() => Array(SCRATCH_FIELDS).fill(false))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const allRevealed = card !== null && revealed.every(Boolean)
  const playing = card !== null && !allRevealed
  const winTiers = SCRATCH_TIERS.filter((t) => t.matches > 0)

  const reveal = (index: number) =>
    setRevealed((prev) => (prev[index] ? prev : prev.map((v, i) => (i === index ? true : v))))

  const revealAll = () => {
    revealed.forEach((done, i) => {
      if (!done) setTimeout(() => reveal(i), i * 140)
    })
  }

  const buy = () =>
    startTransition(async () => {
      setError(null)
      try {
        const res = await buyScratchCard(price)
        if (!res.ok) return setError(res.error)
        setBalance(res.balance)
        setCard({ ...res, price })
        setRevealed(Array(SCRATCH_FIELDS).fill(false))
      } catch {
        setError("Не удалось купить билет. Проверьте соединение.")
      }
    })

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#ff8a3d] to-[#ffb347] p-1.5 shadow-xl shadow-primary/25">
        <div className="rounded-[1.35rem] bg-card p-4 sm:p-6">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Билет {card ? `№ ${String(card.ticketId).padStart(6, "0")}` : `за ${price} BYN`}</p>
              <h2 className="font-display text-xl font-extrabold text-foreground text-balance">{SCRATCH_GAME_NAME}</h2>
            </div>
            <div className="shrink-0 rounded-2xl bg-secondary px-3 py-2 text-right">
              <p className="text-[11px] font-medium text-muted-foreground">Баланс</p>
              <p className="font-display text-base font-extrabold tabular-nums text-foreground">
                {balance.toLocaleString("ru-RU")} <span className="text-xs text-primary">BYN</span>
              </p>
            </div>
          </header>

          <div key={card?.ticketId ?? "preview"} className={cn("grid grid-cols-3 gap-2.5 sm:gap-3", card && "animate-pop")}>
            {Array.from({ length: SCRATCH_FIELDS }, (_, i) => {
              const symbol = card?.fields[i]
              const isWinning = allRevealed && !!card?.winningSymbol && symbol === card.winningSymbol
              return (
                <ScratchField
                  key={i}
                  revealed={revealed[i]}
                  onReveal={() => reveal(i)}
                  disabled={!card}
                  highlight={isWinning}
                  label={card ? `Стереть поле ${i + 1}` : `Поле ${i + 1}, купите билет`}
                >
                  {symbol ? (
                    <div className="flex size-full flex-col items-center justify-center gap-1">
                      <ScratchSymbolBadge symbol={symbol} className="w-full max-w-20" />
                      <span className="sr-only">{SCRATCH_SYMBOL_LABELS[symbol]}</span>
                    </div>
                  ) : null}
                </ScratchField>
              )
            })}
          </div>

          <div className="mt-4 min-h-14" aria-live="polite">
            {!card && (
              <p className="text-center text-sm text-muted-foreground text-pretty">
                Купите билет и сотрите 6 полей пальцем или мышкой. Три и больше одинаковых символов — выигрыш.
              </p>
            )}
            {playing && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Стёрто {revealed.filter(Boolean).length} из {SCRATCH_FIELDS}
                </p>
                <button
                  type="button"
                  onClick={revealAll}
                  className="h-10 rounded-xl bg-secondary px-4 text-sm font-bold text-foreground ring-1 ring-border transition active:scale-95"
                >
                  Стереть всё
                </button>
              </div>
            )}
            {allRevealed && card && (
              <div
                className={cn(
                  "animate-pop flex items-center gap-3 rounded-2xl p-3",
                  card.prize > 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                )}
              >
                {card.winningSymbol && <ScratchSymbolBadge symbol={card.winningSymbol} className="w-11 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-display text-lg font-extrabold">
                    {card.prize > 0 ? `Выигрыш ${card.prize} BYN` : "Без выигрыша"}
                  </p>
                  <p className="text-xs opacity-80">
                    {card.prize > 0
                      ? `${card.matches} одинаковых символа — x${card.multiplier} к цене билета`
                      : "Совпало не больше двух символов. Попробуйте ещё раз!"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl bg-card p-4 ring-1 ring-border sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="font-display text-base font-extrabold text-foreground">Цена билета</p>
          <div role="radiogroup" aria-label="Цена билета" className="grid grid-cols-3 gap-2">
            {SCRATCH_PRICES.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={p === price}
                disabled={playing || pending}
                onClick={() => setPrice(p)}
                className={cn(
                  "h-12 rounded-2xl font-display text-base font-extrabold tabular-nums ring-1 transition disabled:opacity-60",
                  p === price ? "bg-primary text-primary-foreground ring-primary" : "bg-secondary text-foreground ring-border",
                )}
              >
                {p} BYN
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={buy}
          disabled={pending || playing || balance < price}
          className="h-14 rounded-2xl bg-primary font-display text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
        >
          {pending
            ? "Покупаем билет…"
            : playing
              ? "Сначала сотрите все поля"
              : balance < price
                ? "Недостаточно средств"
                : card
                  ? `Ещё билет за ${price} BYN`
                  : `Купить билет за ${price} BYN`}
        </button>

        {error && <Notice tone="error">{error}</Notice>}

        <div>
          <p className="mb-2 font-display text-base font-extrabold text-foreground">Таблица выигрышей</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {winTiers.map((t) => (
              <li key={t.matches} className="rounded-2xl bg-secondary p-3 ring-1 ring-border">
                <p className="text-xs text-muted-foreground">{t.matches} одинаковых</p>
                <p className="font-display text-lg font-extrabold tabular-nums text-foreground">
                  {t.multiplier * price} BYN
                </p>
                <p className="text-[11px] font-bold text-primary">x{t.multiplier}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
