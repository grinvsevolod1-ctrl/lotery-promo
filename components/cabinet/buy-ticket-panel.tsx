"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BoltMark, ShuffleMark, TicketMark } from "@/components/icons"
import { BallRow, LottoBall } from "@/components/lotto-ball"
import { NumberPicker } from "@/components/cabinet/number-picker"
import { Notice, Panel, PanelTitle } from "@/components/cabinet/panel"
import { buyTicket } from "@/app/actions/cabinet"
import { GAMES, NUMBERS_PER_TICKET, randomNumbers } from "@/lib/lottery"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export function BuyTicketPanel({ balance, drawAt, drawId }: { balance: number; drawAt: string; drawId: number }) {
  const router = useRouter()
  const [game, setGame] = useState(GAMES[0].name)
  const [numbers, setNumbers] = useState<number[]>([])
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const cost = GAMES.find((g) => g.name === game)?.cost ?? 0
  const complete = numbers.length === NUMBERS_PER_TICKET
  const remaining = NUMBERS_PER_TICKET - numbers.length
  const canAfford = balance >= cost
  const canBuy = canAfford && (complete || numbers.length === 0)

  const buy = () =>
    startTransition(async () => {
      setMessage(null)
      const res = await buyTicket(game, complete ? numbers : undefined)
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error })
        return
      }
      setMessage({
        tone: "success",
        text: `Билет №${String(res.ticketId).padStart(6, "0")} куплен. Ждём тираж №${drawId} — ${formatDateTime(drawAt)}.`,
      })
      setNumbers([])
      router.refresh()
    })

  const buttonLabel = !canAfford
    ? "Недостаточно бонусов"
    : complete
      ? `Купить за ${cost} BYN`
      : numbers.length === 0
        ? `Случайный билет за ${cost} BYN`
        : `Выберите ещё ${remaining}`

  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle icon={<BoltMark className="size-5" />}>Купить билет</PanelTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          <div role="radiogroup" aria-label="Игра" className="grid gap-2 sm:grid-cols-3">
            {GAMES.map((g) => {
              const active = g.name === game
              return (
                <button
                  key={g.name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setGame(g.name)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                    active
                      ? "border-primary/60 bg-primary/15 shadow-md shadow-primary/20"
                      : "border-border/60 bg-foreground/5 hover:border-foreground/30",
                  )}
                >
                  <span className={cn("inline-flex rounded-xl bg-gradient-to-br p-2 text-primary-foreground", g.tone)}>
                    <TicketMark className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm font-extrabold text-foreground">{g.name}</span>
                    <span className="block text-xs text-muted-foreground">{g.cost} BYN за билет</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Выберите {NUMBERS_PER_TICKET} чисел из 45 или доверьтесь случаю
              </p>
              <span className="shrink-0 rounded-full bg-foreground/10 px-3 py-1 font-mono text-xs font-bold text-foreground/80">
                {numbers.length} / {NUMBERS_PER_TICKET}
              </span>
            </div>
            <NumberPicker value={numbers} onChange={setNumbers} disabled={isPending} />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-background/40 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">Ваш билет</p>
          <div className="flex min-h-11 flex-wrap items-center gap-1.5">
            {numbers.length === 0 ? (
              Array.from({ length: NUMBERS_PER_TICKET }, (_, i) => <LottoBall key={i} value="?" tone="ghost" />)
            ) : (
              <BallRow numbers={numbers} highlight={new Set(numbers)} />
            )}
          </div>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Игра</dt>
              <dd className="font-semibold text-foreground">{game}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Тираж</dt>
              <dd className="font-semibold text-foreground">№{drawId} · {formatDateTime(drawAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Стоимость</dt>
              <dd className="font-display font-extrabold text-gold">{cost} BYN</dd>
            </div>
          </dl>

          <div className="mt-auto flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNumbers(randomNumbers())}
              disabled={isPending}
              className="w-full font-bold"
            >
              <ShuffleMark className="size-4" />
              Случайные числа
            </Button>
            <Button type="button" onClick={buy} disabled={isPending || !canBuy} size="lg" className="cta-shine w-full font-bold">
              {isPending ? "Оформляем..." : buttonLabel}
            </Button>
            {numbers.length > 0 && (
              <button
                type="button"
                onClick={() => setNumbers([])}
                disabled={isPending}
                className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Очистить выбор
              </button>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="mt-4">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
    </Panel>
  )
}
