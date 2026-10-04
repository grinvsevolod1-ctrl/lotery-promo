"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BoltMark, ShuffleMark, TicketMark, TrophyMark } from "@/components/icons"
import { LottoBall } from "@/components/lotto-ball"
import { NumberPicker } from "@/components/cabinet/number-picker"
import { Notice, Panel, PanelTitle } from "@/components/cabinet/panel"
import { buyTicket, type InstantResult } from "@/app/actions/cabinet"
import { GAMES, type GameId, getGame, minWinningMatches, randomNumbers, topPrize } from "@/lib/lottery"
import { cn } from "@/lib/utils"

export function BuyTicketPanel({ balance }: { balance: number }) {
  const router = useRouter()
  const [gameId, setGameId] = useState<GameId>(GAMES[0].id)
  const [numbers, setNumbers] = useState<number[]>([])
  const [result, setResult] = useState<InstantResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const game = getGame(gameId) ?? GAMES[0]
  const complete = numbers.length === game.pick
  const canAfford = balance >= game.cost

  const selectGame = (id: GameId) => {
    setGameId(id)
    setNumbers([])
    setResult(null)
    setError(null)
  }

  const play = (random: boolean) =>
    startTransition(async () => {
      setError(null)
      setResult(null)
      const res = await buyTicket(game.id, random ? undefined : numbers)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setResult(res)
      router.refresh()
    })

  const playAgain = () => {
    setResult(null)
    setNumbers([])
  }

  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle
        icon={<BoltMark className="size-5" />}
        aside={<span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold">Результат сразу</span>}
      >
        Моментальный билет
      </PanelTitle>

      <div role="radiogroup" aria-label="Игра" className="mb-6 grid gap-2 sm:grid-cols-3">
        {GAMES.map((g) => {
          const active = g.id === gameId
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => selectGame(g.id)}
              disabled={isPending}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                active ? "border-primary/60 bg-primary/15 shadow-md shadow-primary/20" : "border-border/60 bg-foreground/5 hover:border-foreground/30",
              )}
            >
              <span className={cn("inline-flex rounded-xl bg-gradient-to-br p-2 text-primary-foreground", g.tone)}>
                <TicketMark className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-sm font-extrabold text-foreground">{g.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {g.pick} из {g.max} · {g.cost} BYN
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {result ? (
        <TicketResult result={result} pick={game.pick} onAgain={playAgain} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,20rem)]">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Отметьте {game.pick} {game.pick < 5 ? "числа" : "чисел"} от 1 до {game.max}
              </p>
              <span className="shrink-0 rounded-full bg-foreground/10 px-3 py-1 font-mono text-xs font-bold text-foreground/80">
                {numbers.length} / {game.pick}
              </span>
            </div>
            <NumberPicker value={numbers} onChange={setNumbers} pick={game.pick} max={game.max} disabled={isPending} />
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-background/40 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gold">Таблица выигрышей</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Выигрыш от {minWinningMatches(game)} совпадений, суперприз {topPrize(game).toLocaleString("ru-RU")} BYN
              </p>
            </div>
            <ul className="flex flex-col gap-1.5 text-sm">
              {Object.entries(game.prizes)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([m, prize]) => (
                  <li key={m} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {m} из {game.pick}
                    </span>
                    <span className="font-display font-extrabold text-foreground">{prize.toLocaleString("ru-RU")} BYN</span>
                  </li>
                ))}
            </ul>

            <div className="mt-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={() => play(false)}
                disabled={isPending || !complete || !canAfford}
                className="cta-shine relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-110 disabled:opacity-50"
              >
                {isPending
                  ? "Разыгрываем…"
                  : !canAfford
                    ? "Пополните баланс"
                    : complete
                      ? `Играть за ${game.cost} BYN`
                      : `Отметьте ещё ${game.pick - numbers.length}`}
              </button>
              <button
                type="button"
                onClick={() => (complete ? setNumbers(randomNumbers(game.pick, game.max)) : play(true))}
                disabled={isPending || (!complete && !canAfford)}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-foreground/10 text-sm font-semibold text-foreground transition hover:bg-foreground/15 disabled:opacity-50"
              >
                <ShuffleMark className="size-4" />
                {complete ? "Другие случайные числа" : "Случайный билет и сразу играть"}
              </button>
              {numbers.length > 0 && !complete && (
                <button
                  type="button"
                  onClick={() => setNumbers(randomNumbers(game.pick, game.max))}
                  className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Дозаполнить случайно
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </Panel>
  )
}

function TicketResult({ result, pick, onAgain }: { result: InstantResult; pick: number; onAgain: () => void }) {
  const mine = new Set(result.numbers)
  const isWin = result.prize > 0

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-6 rounded-3xl border p-6 text-center sm:p-8",
        isWin ? "border-gold/60 bg-gold/10" : "border-border/60 bg-background/40",
      )}
    >
      <div className="flex flex-col items-center gap-2">
        {isWin && <TrophyMark className="size-10 text-gold animate-pop" />}
        <p className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
          {isWin ? `+${result.prize.toLocaleString("ru-RU")} BYN` : "В этот раз мимо"}
        </p>
        <p className="text-sm text-muted-foreground">
          Билет №{String(result.ticketId).padStart(6, "0")} · {result.game} · совпало {result.matches} из {pick}
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold">Выпавшие числа</p>
          <div className="flex flex-wrap justify-center gap-2">
            {result.winning.map((n, i) => (
              <span key={n} className="animate-ball-reveal" style={{ animationDelay: `${i * 120}ms` }}>
                <LottoBall value={n} size="lg" tone={mine.has(n) ? "hit" : "muted"} />
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Ваши числа</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {result.numbers.map((n) => (
              <LottoBall key={n} value={n} tone={result.winning.includes(n) ? "hit" : "default"} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onAgain}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 font-bold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-110"
        >
          <TicketMark className="size-5" />
          Сыграть ещё
        </button>
        <p className="text-xs text-muted-foreground">Баланс: {result.balance.toLocaleString("ru-RU")} BYN</p>
      </div>
    </div>
  )
}
