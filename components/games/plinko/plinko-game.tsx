"use client"

import { win as playWin } from "@/lib/feedback"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { dropPlinkoBall } from "@/app/actions/games"
import { Notice } from "@/components/cabinet/panel"
import { PlinkoBoard, slotTone, type PlinkoBoardHandle } from "@/components/games/plinko/plinko-board"
import {
  PLINKO_MAX_ROWS,
  PLINKO_MAX_STAKE,
  PLINKO_MIN_ROWS,
  PLINKO_MIN_STAKE,
  PLINKO_RISKS,
  formatMultiplier,
  plinkoMultipliers,
  type PlinkoRisk,
} from "@/lib/games/plinko"
import { cn } from "@/lib/utils"

const ROW_OPTIONS = Array.from({ length: PLINKO_MAX_ROWS - PLINKO_MIN_ROWS + 1 }, (_, i) => PLINKO_MIN_ROWS + i)
const AUTO_COUNTS = [10, 25, 50, 100] as const

type Mode = "manual" | "auto"
type Landed = { id: number; multiplier: number; payout: number; stake: number }

/** Server actions run one at a time on the client; capping the queue keeps taps responsive. */
const MAX_PENDING_REQUESTS = 3
const REFRESH_DELAY_MS = 1200

const roundMoney = (value: number) => Math.round(value * 100) / 100
const formatMoney = (value: number) =>
  roundMoney(value).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const clampStake = (value: number) => Math.min(PLINKO_MAX_STAKE, Math.max(PLINKO_MIN_STAKE, Math.round(value)))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function PlinkoGame({ initialBalance }: { initialBalance: number }) {
  const router = useRouter()
  const boardRef = useRef<PlinkoBoardHandle>(null)
  const stopRef = useRef(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pending, setPending] = useState(0)
  const [balance, setBalance] = useState(initialBalance)
  const [stakeInput, setStakeInput] = useState("1")
  const [risk, setRisk] = useState<PlinkoRisk>("low")
  const [rows, setRows] = useState(8)
  const [mode, setMode] = useState<Mode>("manual")
  const [autoCount, setAutoCount] = useState<number>(10)
  const [autoLeft, setAutoLeft] = useState(0)
  const [inFlight, setInFlight] = useState(0)
  const [history, setHistory] = useState<Landed[]>([])
  const [error, setError] = useState<string | null>(null)

  const stake = Number.parseInt(stakeInput, 10)
  const stakeValid = Number.isInteger(stake) && stake >= PLINKO_MIN_STAKE && stake <= PLINKO_MAX_STAKE
  const multipliers = plinkoMultipliers(rows, risk)
  const autoRunning = autoLeft > 0
  const locked = inFlight > 0 || autoRunning

  const dropOne = async (): Promise<boolean> => {
    if (!stakeValid) {
      setError(`Ставка — целое число от ${PLINKO_MIN_STAKE} до ${PLINKO_MAX_STAKE} BYN`)
      return false
    }
    setError(null)
    setInFlight((n) => n + 1)
    setPending((n) => n + 1)
    try {
      const res = await dropPlinkoBall(stake, rows, risk).finally(() => setPending((n) => n - 1))
      if (!res.ok) {
        setError(res.error)
        return false
      }
      setBalance((b) => roundMoney(b - stake))
      const landed = boardRef.current?.drop(res.path) ?? Promise.resolve(0)
      void landed.then(() => {
        playWin(res.multiplier)
        setBalance((b) => roundMoney(b + res.payout))
        setHistory((h) => [{ id: res.ticketId, multiplier: res.multiplier, payout: res.payout, stake }, ...h].slice(0, 20))
        scheduleRefresh()
      })
      await sleep(rows * 140 + 160)
      return true
    } catch {
      setError("Не удалось сделать ставку. Проверьте соединение.")
      return false
    } finally {
      setInFlight((n) => n - 1)
    }
  }

  // The header balance lives in the server layout; refresh it once after a burst of balls settles.
  function scheduleRefresh() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => router.refresh(), REFRESH_DELAY_MS)
  }

  // Manual balls may overlap: the board animates several at once, like a real Plinko.
  const manualDrop = () => {
    if (pending >= MAX_PENDING_REQUESTS) return
    void dropOne()
  }

  const startAuto = async () => {
    stopRef.current = false
    let left = autoCount
    setAutoLeft(left)
    while (left > 0 && !stopRef.current) {
      const ok = await dropOne()
      if (!ok) break
      left -= 1
      setAutoLeft(left)
    }
    setAutoLeft(0)
  }

  const last = history[0]
  const sessionNet = roundMoney(history.reduce((sum, h) => sum + h.payout - h.stake, 0))

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-3xl bg-card p-4 ring-1 ring-border sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="rounded-2xl bg-secondary px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">Баланс</p>
            <p className="font-display text-lg font-extrabold tabular-nums text-foreground">
              {formatMoney(balance)} <span className="text-sm text-primary">BYN</span>
            </p>
          </div>
          <div aria-live="polite" className="min-w-0 text-right">
            {last ? (
              <>
                <p className="text-[11px] font-medium text-muted-foreground">Последний шарик</p>
                <p
                  key={last.id}
                  className={cn(
                    "animate-pop font-display text-lg font-extrabold tabular-nums",
                    last.payout > last.stake ? "text-primary" : "text-foreground",
                  )}
                >
                  {formatMultiplier(last.multiplier)} · {last.payout > 0 ? `+${formatMoney(last.payout)}` : "0"} BYN
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-pretty">Пустите шарик — множитель лунки умножит ставку</p>
            )}
          </div>
        </div>

        <PlinkoBoard ref={boardRef} rows={rows} multipliers={multipliers} />

        {history.length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1" aria-label="Последние результаты">
              {history.map((h) => (
                <li
                  key={h.id}
                  className={cn(
                    "shrink-0 rounded-full border-2 bg-background px-2.5 py-0.5 font-display text-xs font-extrabold tabular-nums",
                    slotTone(h.multiplier).ring,
                  )}
                >
                  {formatMultiplier(h.multiplier)}
                </li>
              ))}
            </ul>
            <span className={cn("shrink-0 text-xs font-bold tabular-nums", sessionNet >= 0 ? "text-primary" : "text-muted-foreground")}>
              {sessionNet > 0 ? "+" : ""}
              {formatMoney(sessionNet)} BYN за сессию
            </span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5 rounded-3xl bg-card p-4 ring-1 ring-border sm:p-6">
        {mode === "manual" ? (
          <button
            type="button"
            onClick={manualDrop}
            disabled={!stakeValid || balance < stake}
            className="h-14 rounded-2xl bg-primary font-display text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
          >
            {balance < stake ? "Недостаточно средств" : "Пустить шарик"}
          </button>
        ) : autoRunning ? (
          <button
            type="button"
            onClick={() => (stopRef.current = true)}
            className="h-14 rounded-2xl bg-foreground font-display text-lg font-extrabold text-background transition active:scale-[0.98]"
          >
            Остановить · осталось {autoLeft}
          </button>
        ) : (
          <button
            type="button"
            onClick={startAuto}
            disabled={!stakeValid || balance < stake || inFlight > 0}
            className="h-14 rounded-2xl bg-primary font-display text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
          >
            Запустить {autoCount} шариков
          </button>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <Segmented
          label="Режим"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          disabled={autoRunning}
          options={[
            { value: "manual", label: "Ручные ставки" },
            { value: "auto", label: "Авто ставки" },
          ]}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="plinko-stake" className="font-display text-base font-extrabold text-foreground">
            Ставка, BYN
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-secondary p-1.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
            <input
              id="plinko-stake"
              inputMode="numeric"
              value={stakeInput}
              disabled={autoRunning}
              onChange={(e) => setStakeInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onBlur={() => setStakeInput(String(clampStake(Number(stakeInput) || PLINKO_MIN_STAKE)))}
              className="h-11 min-w-0 flex-1 bg-transparent px-3 font-display text-lg font-extrabold tabular-nums text-foreground outline-none"
              aria-describedby="plinko-stake-hint"
            />
            <button
              type="button"
              disabled={autoRunning}
              onClick={() => setStakeInput(String(clampStake((stakeValid ? stake : 1) / 2)))}
              className="h-11 rounded-xl bg-card px-4 font-display font-extrabold text-foreground ring-1 ring-border transition active:scale-95 disabled:opacity-50"
            >
              1/2
            </button>
            <button
              type="button"
              disabled={autoRunning}
              onClick={() => setStakeInput(String(clampStake((stakeValid ? stake : 1) * 2)))}
              className="h-11 rounded-xl bg-card px-4 font-display font-extrabold text-foreground ring-1 ring-border transition active:scale-95 disabled:opacity-50"
            >
              x2
            </button>
          </div>
          <p id="plinko-stake-hint" className="text-xs text-muted-foreground">
            От {PLINKO_MIN_STAKE} до {PLINKO_MAX_STAKE} BYN. Выигрыш округляется вниз до целых BYN.
          </p>
        </div>

        {mode === "auto" && (
          <Segmented
            label="Количество шариков"
            value={String(autoCount)}
            onChange={(v) => setAutoCount(Number(v))}
            disabled={autoRunning}
            options={AUTO_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
          />
        )}

        <Segmented
          label="Риск"
          value={risk}
          onChange={(v) => setRisk(v as PlinkoRisk)}
          disabled={locked}
          options={PLINKO_RISKS.map((r) => ({ value: r.id, label: r.label }))}
        />

        <Segmented
          label="Количество пинов"
          value={String(rows)}
          onChange={(v) => setRows(Number(v))}
          disabled={locked}
          dense
          options={ROW_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
        />
        {locked && <p className="-mt-3 text-xs text-muted-foreground">Риск и пины меняются, когда все шарики упадут.</p>}
      </section>
    </div>
  )
}

function Segmented({
  label,
  value,
  options,
  onChange,
  disabled,
  dense,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  dense?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-display text-base font-extrabold text-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex overflow-hidden rounded-2xl ring-1 ring-border">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-w-0 flex-1 border-l border-border font-display font-extrabold tabular-nums transition first:border-l-0 disabled:cursor-not-allowed",
                dense ? "h-11 text-sm" : "h-12 text-sm sm:text-base",
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
                disabled && !active && "opacity-60",
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
