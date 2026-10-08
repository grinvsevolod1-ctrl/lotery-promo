"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { tap, tick, win } from "@/lib/feedback"
import {
  collectNinjaRound,
  getActiveNinjaRound,
  openNinjaScroll,
  playNinjaAuto,
  startNinjaRound,
  type NinjaRoundView,
} from "@/app/actions/ninja"
import { Notice } from "@/components/cabinet/panel"
import { NinjaBoard, type NinjaBoardHandle } from "@/components/games/ninja/ninja-board"
import { LadderStrip, RankBar } from "@/components/games/ninja/ninja-ranks"
import { NinjaShell } from "@/components/games/ninja/ninja-shell"
import {
  NINJA_AWAKENINGS,
  NINJA_CELLS,
  NINJA_MAX_STAKE,
  NINJA_MAX_TRAPS,
  NINJA_MIN_STAKE,
  NINJA_MIN_TRAPS,
  NINJA_RANKS,
  awakeningCost,
  currentMultiplier,
  formatNinjaMultiplier,
  initialNinjaState,
  ninjaLadder,
  ninjaPayout,
  previewNextMultiplier,
  revealNinjaCell,
  type NinjaEvent,
  type NinjaRankId,
  type NinjaState,
} from "@/lib/games/ninja"
import { cn } from "@/lib/utils"

type Mode = "manual" | "auto"
type Outcome = { id: number; multiplier: number; payout: number; cost: number; status: NinjaState["status"]; rank: NinjaRankId | null }

const TRAP_OPTIONS = Array.from({ length: NINJA_MAX_TRAPS - NINJA_MIN_TRAPS + 1 }, (_, i) => NINJA_MIN_TRAPS + i)
const AUTO_COUNTS = [5, 10, 25, 50] as const
const REVEAL_STEP_MS = 230
const TSUKUYOMI_MS = 1500
const REFRESH_DELAY_MS = 1200

const roundMoney = (value: number) => Math.round(value * 100) / 100
const formatMoney = (value: number) => roundMoney(value).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const clampStake = (value: number) => Math.min(NINJA_MAX_STAKE, Math.max(NINJA_MIN_STAKE, Math.round(value)))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Rebuilds the state after the first `count` reveals, for step-by-step replays. */
function replay(round: NinjaRoundView, count: number): NinjaState {
  const { state } = round
  if (count >= state.revealed.length) return state
  const layout = { traps: round.trapCells ?? [], sharingan: state.sharingan, sealOrder: state.sealed }
  let current = initialNinjaState(state.traps)
  for (const cell of state.revealed.slice(0, count)) current = revealNinjaCell(current, layout, cell).state
  return current
}

export function NinjaGame({ initialBalance, initialRound }: { initialBalance: number; initialRound: NinjaRoundView | null }) {
  const router = useRouter()
  const boardRef = useRef<NinjaBoardHandle>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const stopRef = useRef(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevRank = useRef<NinjaRankId | null>(initialRound?.state.rank ?? null)

  const [balance, setBalance] = useState(initialBalance)
  const [round, setRound] = useState<NinjaRoundView | null>(initialRound)
  const [shown, setShown] = useState(Number.POSITIVE_INFINITY)
  const [trapCells, setTrapCells] = useState<number[] | null>(initialRound?.trapCells ?? null)
  const [stakeInput, setStakeInput] = useState("1")
  const [traps, setTraps] = useState(3)
  const [mode, setMode] = useState<Mode>("manual")
  const [awakening, setAwakening] = useState(0)
  const [autoCount, setAutoCount] = useState<number>(10)
  const [autoLeft, setAutoLeft] = useState(0)
  const [picks, setPicks] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [tsukuyomi, setTsukuyomi] = useState(false)
  const [rankUp, setRankUp] = useState<{ id: NinjaRankId; refund: number; key: number } | null>(null)
  const [history, setHistory] = useState<Outcome[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dealKey, setDealKey] = useState(0)
  const [burstKey, setBurstKey] = useState(0)
  const [sheet, setSheet] = useState(false)

  const celebrate = (multiplier: number) => {
    win(multiplier)
    if (multiplier > 1) setBurstKey(Date.now())
  }

  const stake = Number.parseInt(stakeInput, 10)
  const stakeValid = Number.isInteger(stake) && stake >= NINJA_MIN_STAKE && stake <= NINJA_MAX_STAKE
  const displayState = round ? replay(round, shown) : null
  const active = displayState?.status === "active"
  const finished = !!displayState && displayState.status !== "active" && shown === Number.POSITIVE_INFINITY && !tsukuyomi
  const autoRunning = autoLeft > 0
  const settingsLocked = !!round && !finished
  const pickMode = mode === "auto" && !autoRunning && (!round || finished)

  const effectiveTraps = round?.traps ?? traps
  const effectiveStake = round?.stake ?? (stakeValid ? stake : 1)
  const ladder = useMemo(() => ninjaLadder(effectiveTraps), [effectiveTraps])
  const roundCost = stakeValid ? awakeningCost(stake, traps, mode === "manual" ? awakening : 0) : 0
  const payoutNow = displayState ? ninjaPayout(effectiveStake, currentMultiplier(displayState)) : 0
  const nextMult = displayState && active ? previewNextMultiplier(displayState) : ladder[1]

  // Rank-up banner whenever the shown rank climbs during a live round.
  useEffect(() => {
    const rank = displayState?.rank ?? null
    if (rank && rank !== prevRank.current && displayState?.status === "active") {
      setRankUp({ id: rank, refund: displayState.refund, key: Date.now() })
      tap()
    }
    prevRank.current = rank
  }, [displayState?.rank, displayState?.refund, displayState?.status])

  // Everything lives on one screen; starting a round only needs the settings sheet out of the way.
  function focusBoard() {
    setSheet(false)
  }

  function scheduleRefresh() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => router.refresh(), REFRESH_DELAY_MS)
  }

  function record(view: NinjaRoundView) {
    const multiplier = currentMultiplier(view.state)
    setHistory((h) =>
      [{ id: view.id, multiplier, payout: view.payout, cost: view.cost, status: view.state.status, rank: view.state.rank }, ...h].slice(0, 20),
    )
    scheduleRefresh()
  }

  async function runTsukuyomi(view: NinjaRoundView) {
    setTsukuyomi(true)
    win(0)
    await sleep(TSUKUYOMI_MS * 0.45)
    setTrapCells(view.trapCells)
    await sleep(TSUKUYOMI_MS * 0.55)
    setTsukuyomi(false)
  }

  async function resync() {
    const current = await getActiveNinjaRound().catch(() => null)
    setRound(current)
    setTrapCells(current?.trapCells ?? null)
    setShown(Number.POSITIVE_INFINITY)
  }

  const start = async () => {
    if (!stakeValid) return setError(`Ставка — целое число от ${NINJA_MIN_STAKE} до ${NINJA_MAX_STAKE} BYN`)
    setError(null)
    setBusy(true)
    try {
      const res = await startNinjaRound(stake, traps, awakening)
      if (!res.ok) return setError(res.error)
      setBalance(res.balance)
      setTrapCells(null)
      prevRank.current = null
      setRound(res.round)
      setShown(0)
      setDealKey(res.round.id)
      tap()
      focusBoard()
      await sleep(REVEAL_STEP_MS)
      for (let i = 0; i < res.preRevealed.length; i++) {
        await boardRef.current?.throwKunai(res.preRevealed[i])
        tick()
        setShown(i + 1)
        await sleep(REVEAL_STEP_MS * 0.6)
      }
      setShown(Number.POSITIVE_INFINITY)
      if (res.round.state.status !== "active") record(res.round)
    } catch {
      setError("Не удалось начать раунд. Проверьте соединение.")
    } finally {
      setBusy(false)
    }
  }

  const open = async (cell: number) => {
    if (!round || busy || !active) return
    setError(null)
    setBusy(true)
    try {
      const [res] = await Promise.all([openNinjaScroll(round.id, cell), boardRef.current?.throwKunai(cell)])
      if (!res.ok) {
        setError(res.error)
        if (/завершён|не найден/.test(res.error)) await resync()
        return
      }
      setRound(res.round)
      if (res.event?.type === "bust") {
        await runTsukuyomi(res.round)
      } else {
        tick()
        if (res.event?.type === "safe" && res.event.sharingan) setTimeout(tap, 300)
        if (res.round.state.status === "complete") {
          setTrapCells(res.round.trapCells)
          celebrate(currentMultiplier(res.round.state))
        }
      }
      if (res.balance !== null) setBalance(res.balance)
      if (res.round.state.status !== "active") record(res.round)
    } catch {
      setError("Не удалось открыть свиток. Проверьте соединение.")
    } finally {
      setBusy(false)
    }
  }

  const collect = async () => {
    if (!round || busy || !active) return
    setError(null)
    setBusy(true)
    try {
      const res = await collectNinjaRound(round.id)
      if (!res.ok) {
        setError(res.error)
        if (/завершён|не найден/.test(res.error)) await resync()
        return
      }
      setRound(res.round)
      setTrapCells(res.round.trapCells)
      if (res.balance !== null) setBalance(res.balance)
      celebrate(currentMultiplier(res.round.state))
      record(res.round)
    } catch {
      setError("Не удалось забрать выигрыш. Проверьте соединение.")
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setRound(null)
    setTrapCells(null)
    setShown(Number.POSITIVE_INFINITY)
    setDealKey(Date.now())
    prevRank.current = null
    setError(null)
    tap()
  }

  const togglePick = (cell: number) => {
    tap()
    setPicks((p) => (p.includes(cell) ? p.filter((c) => c !== cell) : [...p, cell]))
  }

  const randomPicks = (count: number) => {
    const cells = Array.from({ length: NINJA_CELLS }, (_, i) => i)
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[cells[i], cells[j]] = [cells[j], cells[i]]
    }
    setPicks(cells.slice(0, count))
  }

  async function animateAuto(view: NinjaRoundView, events: NinjaEvent[]) {
    setTrapCells(null)
    prevRank.current = null
    setRound(view)
    setShown(0)
    setDealKey(view.id)
    await sleep(REVEAL_STEP_MS)
    let safe = 0
    for (const event of events) {
      await boardRef.current?.throwKunai(event.cell)
      if (event.type === "bust") {
        setShown(Number.POSITIVE_INFINITY)
        await runTsukuyomi(view)
        return
      }
      safe += 1
      tick()
      setShown(safe)
      await sleep(REVEAL_STEP_MS)
    }
    setShown(Number.POSITIVE_INFINITY)
    setTrapCells(view.trapCells)
    celebrate(currentMultiplier(view.state))
    await sleep(500)
  }

  const startAuto = async () => {
    if (!stakeValid) return setError(`Ставка — целое число от ${NINJA_MIN_STAKE} до ${NINJA_MAX_STAKE} BYN`)
    if (picks.length === 0) return setError("Выберите на поле свитки, которые откроет авто-режим")
    setError(null)
    stopRef.current = false
    let left = autoCount
    setAutoLeft(left)
    setBusy(true)
    focusBoard()
    try {
      while (left > 0 && !stopRef.current) {
        const res = await playNinjaAuto(stake, traps, picks)
        if (!res.ok) {
          setError(res.error)
          break
        }
        setBalance((b) => roundMoney(b - stake))
        await animateAuto(res.round, res.events)
        setBalance(res.balance)
        record(res.round)
        left -= 1
        setAutoLeft(left)
        if (left > 0 && !stopRef.current) await sleep(400)
      }
    } catch {
      setError("Авто-режим прерван. Проверьте соединение.")
    } finally {
      setAutoLeft(0)
      setBusy(false)
    }
  }

  const sessionNet = roundMoney(history.reduce((sum, h) => sum + h.payout - h.cost, 0))
  const last = history[0]
  const multiplierShown = displayState ? currentMultiplier(displayState) : 0
  const maxReveals = NINJA_CELLS - effectiveTraps

  const stepStake = (dir: -1 | 1) => setStakeInput(String(clampStake((stakeValid ? stake : NINJA_MIN_STAKE) + dir * (stake >= 50 ? 10 : stake >= 10 ? 5 : 1))))
  const stepTraps = (dir: -1 | 1) => setTraps(Math.min(NINJA_MAX_TRAPS, Math.max(NINJA_MIN_TRAPS, traps + dir)))
  const controlsLocked = settingsLocked || autoRunning

  return (
    <NinjaShell balance={balance} onSettings={() => setSheet(true)} settingsOpen={sheet}>
    <div ref={stageRef} className="ninja flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ninja-gold)]">
            {round ? `Раунд № ${String(round.id).padStart(6, "0")}` : mode === "auto" ? "Авто-режим" : "Новый путь"}
          </p>
          <p className="truncate font-display text-xs font-extrabold text-muted-foreground">
            {effectiveTraps} {pluralTraps(effectiveTraps)} ·{" "}
            {finished ? "раунд завершён" : active ? `дальше ${formatNinjaMultiplier(nextMult)}` : `первый ${formatNinjaMultiplier(nextMult)}`}
          </p>
        </div>
        <div className="flex items-baseline gap-2 text-right" aria-live="polite">
          <p
            key={`${multiplierShown}-${displayState?.status ?? "idle"}`}
            className={cn(
              "ninja-bump font-display text-3xl font-black tabular-nums leading-none",
              multiplierShown > 1 ? "text-[var(--ninja-gold)]" : "text-foreground",
            )}
          >
            {displayState && displayState.revealed.length > 0 ? formatNinjaMultiplier(multiplierShown) : "x0"}
          </p>
          <p className="text-xs font-bold tabular-nums text-muted-foreground">{formatMoney(payoutNow)} BYN</p>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 [container-type:size]">
        <div className="mx-auto w-[min(100%,100cqh)]">
          <NinjaBoard
            ref={boardRef}
            state={displayState}
            trapCells={trapCells}
            disabled={busy}
            onOpen={open}
            pickMode={pickMode}
            picks={pickMode ? picks : []}
            onTogglePick={togglePick}
            tsukuyomi={tsukuyomi}
            rankUp={rankUp}
            dealKey={dealKey}
            burstKey={burstKey}
          />
        </div>

        {finished && round && displayState && (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-40">
            <ResultCard view={round} state={displayState} />
          </div>
        )}
        {error && (
          <div className="absolute inset-x-2 top-2 z-40">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <RankBar
          reveals={displayState?.revealed.length ?? 0}
          rank={displayState?.rank ?? null}
          refund={displayState?.refund ?? 0}
          maxReveals={maxReveals}
        />
      </div>

      <div className="flex shrink-0 items-stretch gap-2">
        <Stepper
          label="Ставка"
          unit="BYN"
          value={stakeInput}
          disabled={controlsLocked}
          onDec={() => stepStake(-1)}
          onInc={() => stepStake(1)}
          onInput={(v) => setStakeInput(v.replace(/\D/g, "").slice(0, 3))}
          onBlur={() => setStakeInput(String(clampStake(Number(stakeInput) || NINJA_MIN_STAKE)))}
          inputId="ninja-stake"
        />
        <Stepper
          label="Ловушки"
          value={String(traps)}
          disabled={controlsLocked}
          onDec={() => stepTraps(-1)}
          onInc={() => stepTraps(1)}
        />
      </div>

      <div className="flex shrink-0 flex-col pb-[max(env(safe-area-inset-bottom),4px)]">
        {mode === "manual" ? (
          round && !finished ? (
            <button
              type="button"
              onClick={collect}
              disabled={busy || !active || (displayState?.revealed.length ?? 0) === 0}
              className="h-12 rounded-2xl bg-[var(--ninja-gold)] font-display text-base font-extrabold text-[var(--ninja-ink)] shadow-lg shadow-[var(--ninja-gold)]/30 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {(displayState?.revealed.length ?? 0) === 0 ? "Откройте первый свиток" : `Забрать ${formatMoney(payoutNow)} BYN`}
            </button>
          ) : finished ? (
            <button
              type="button"
              onClick={reset}
              className="h-12 rounded-2xl bg-primary font-display text-base font-extrabold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-105 active:scale-[0.98]"
            >
              Новый раунд
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={busy || !stakeValid || balance < roundCost}
              className="h-12 rounded-2xl bg-primary font-display text-base font-extrabold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {busy
                ? "Готовим поле…"
                : balance < roundCost
                  ? "Недостаточно средств"
                  : awakening > 0
                    ? `Пробуждение за ${formatMoney(roundCost)} BYN`
                    : `Начать путь за ${formatMoney(roundCost)} BYN`}
            </button>
          )
        ) : autoRunning ? (
          <button
            type="button"
            onClick={() => (stopRef.current = true)}
            className="h-12 rounded-2xl bg-foreground font-display text-base font-extrabold text-background transition active:scale-[0.98]"
          >
            Остановить · осталось {autoLeft}
          </button>
        ) : finished && round ? (
          <button
            type="button"
            onClick={reset}
            className="h-12 rounded-2xl bg-secondary font-display text-base font-extrabold text-foreground ring-1 ring-border transition active:scale-[0.98]"
          >
            Очистить поле
          </button>
        ) : (
          <button
            type="button"
            onClick={startAuto}
            disabled={busy || !stakeValid || balance < stake || picks.length === 0 || (!!round && !finished)}
            className="h-12 rounded-2xl bg-primary font-display text-base font-extrabold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
          >
            {picks.length === 0 ? "Отметьте свитки на поле" : `Запустить ${autoCount} раундов · ${picks.length} ${pluralScrolls(picks.length)}`}
          </button>
        )}
      </div>
    </div>

    {sheet && (
      <div className="fixed inset-0 z-[90] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Настройки игры">
        <button type="button" aria-label="Закрыть настройки" onClick={() => setSheet(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <section className="ninja-sheet relative flex max-h-[88%] flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-3xl bg-card p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-border">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-black text-foreground">Настройки</h2>
            <button
              type="button"
              onClick={() => setSheet(false)}
              className="h-9 rounded-full bg-secondary px-4 text-sm font-bold text-foreground ring-1 ring-border active:scale-95"
            >
              Готово
            </button>
          </div>

        <Segmented
          label="Режим"
          value={mode}
          onChange={(v) => {
            setMode(v as Mode)
            if (v === "auto") setAwakening(0)
          }}
          disabled={settingsLocked || autoRunning}
          options={[
            { value: "manual", label: "Вручную" },
            { value: "auto", label: "Авто-режим" },
          ]}
        />

        <Segmented
          label="Ловушки на поле"
          value={String(traps)}
          onChange={(v) => setTraps(Number(v))}
          disabled={settingsLocked || autoRunning}
          dense
          options={TRAP_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
        />
        <p className="-mt-2 text-xs text-muted-foreground">
          Ставка от {NINJA_MIN_STAKE} до {NINJA_MAX_STAKE} BYN. Выигрыш = ставка × множитель, до x5000.
        </p>

        {mode === "manual" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-base font-extrabold text-foreground">Пробуждение</p>
              <p className="text-xs text-muted-foreground">Бонус-покупка: старт сразу с ранга</p>
            </div>
            <div role="radiogroup" aria-label="Пробуждение" className="grid grid-cols-3 gap-2">
              {[{ id: null, reveals: 0 }, ...NINJA_AWAKENINGS].map((a) => {
                const activeOpt = awakening === a.reveals
                const price = stakeValid ? awakeningCost(stake, traps, a.reveals) : 0
                const rank = a.id ? NINJA_RANKS.find((r) => r.id === a.id) : null
                return (
                  <button
                    key={a.reveals}
                    type="button"
                    role="radio"
                    aria-checked={activeOpt}
                    disabled={settingsLocked}
                    onClick={() => setAwakening(a.reveals)}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center rounded-2xl ring-1 transition disabled:opacity-60",
                      activeOpt ? "bg-[var(--ninja-ink)] text-white ring-[var(--ninja-gold)]" : "bg-secondary text-foreground ring-border",
                    )}
                  >
                    <span className="font-display text-sm font-extrabold">{rank ? `Ранг ${rank.label}` : "Без бонуса"}</span>
                    <span className={cn("text-[11px] font-bold tabular-nums", activeOpt ? "text-[var(--ninja-gold)]" : "text-muted-foreground")}>
                      {rank ? `${formatMoney(price)} BYN · ${a.reveals} открыто` : `${formatMoney(stakeValid ? stake : 0)} BYN`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <>
            <Segmented
              label="Количество раундов"
              value={String(autoCount)}
              onChange={(v) => setAutoCount(Number(v))}
              disabled={autoRunning}
              options={AUTO_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-base font-extrabold text-foreground">Свитки для авто-режима</p>
                <p className="text-xs tabular-nums text-muted-foreground">Выбрано {picks.length}</p>
              </div>
              <p className="text-xs text-muted-foreground text-pretty">
                Отметьте свитки на поле в нужном порядке. Каждый раунд они открываются по очереди, после последнего выигрыш забирается автоматически.
              </p>
              <div className="flex gap-2">
                {[3, 5, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={autoRunning}
                    onClick={() => randomPicks(n)}
                    className="h-10 flex-1 rounded-xl bg-secondary text-sm font-bold text-foreground ring-1 ring-border transition active:scale-95 disabled:opacity-50"
                  >
                    Случайно {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={autoRunning || picks.length === 0}
                  onClick={() => setPicks([])}
                  className="h-10 rounded-xl px-3 text-sm font-bold text-muted-foreground ring-1 ring-border transition active:scale-95 disabled:opacity-50"
                >
                  Сброс
                </button>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-base font-extrabold text-foreground">Лестница множителей</p>
            <p className="text-xs text-muted-foreground">Шаринган меняет шаги по ходу раунда</p>
          </div>
          <LadderStrip ladder={ladder} current={displayState?.revealed.length ?? 0} stake={effectiveStake} />
        </div>

        <details className="group rounded-2xl bg-secondary p-4 ring-1 ring-border">
          <summary className="cursor-pointer list-none font-display text-base font-extrabold text-foreground [&::-webkit-details-marker]:hidden">
            Как играть
          </summary>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li>На поле 25 свитков, часть из них — ловушки Акацуки. Открываете свиток кунаем: чакра поднимает множитель, ловушка заканчивает раунд.</li>
            <li>Забрать выигрыш можно после любого открытого свитка.</li>
            <li>
              Ранги: {NINJA_RANKS.map((r) => `${r.label} — ${r.reveals}`).join(", ")} свитков. С рангом половина его множителя закрепляется и выплачивается даже при провале.
            </li>
            <li>Шаринган: некоторые свитки чакры показывают и запечатывают одну ловушку. Лестница пересчитывается честно — ожидаемый возврат не меняется.</li>
            <li>Пробуждение: раунд начинается уже с рангом Генин или Чунин. Цена равна стоимости этого состояния — возврат остаётся 95%.</li>
            <li>Каждый раунд записывается с криптографическим сидом: результат воспроизводим и проверяем.</li>
          </ul>
        </details>

        {history.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-base font-extrabold text-foreground">Последние раунды</p>
              <span className={cn("text-xs font-bold tabular-nums", sessionNet >= 0 ? "text-primary" : "text-muted-foreground")}>
                {sessionNet > 0 ? "+" : ""}
                {formatMoney(sessionNet)} BYN за сессию
              </span>
            </div>
            <ul className="flex flex-wrap gap-1.5" aria-label="Последние раунды">
              {history.map((h) => (
                <li
                  key={h.id}
                  className={cn(
                    "rounded-full border-2 bg-background px-2.5 py-0.5 font-display text-xs font-extrabold tabular-nums",
                    h.status === "bust" ? "border-[var(--ninja-red)]/60 text-muted-foreground" : h.payout > h.cost ? "border-primary text-primary" : "border-border text-foreground",
                  )}
                >
                  {h.status === "bust" && h.payout === 0 ? "ловушка" : formatNinjaMultiplier(h.multiplier)}
                </li>
              ))}
            </ul>
          </div>
        )}
        </section>
      </div>
    )}
    </NinjaShell>
  )
}

function Stepper({
  label,
  unit,
  value,
  disabled,
  onDec,
  onInc,
  onInput,
  onBlur,
  inputId,
}: {
  label: string
  unit?: string
  value: string
  disabled?: boolean
  onDec: () => void
  onInc: () => void
  onInput?: (value: string) => void
  onBlur?: () => void
  inputId?: string
}) {
  const btn = "flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-display text-xl font-black text-foreground ring-1 ring-white/15 transition active:scale-95 disabled:opacity-40"
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl bg-card/80 p-1.5 ring-1 ring-border backdrop-blur">
      <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
        {unit ? <span className="normal-case tracking-normal"> · {unit}</span> : null}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onDec} disabled={disabled} aria-label={`${label}: меньше`} className={btn}>
          −
        </button>
        {onInput ? (
          <input
            id={inputId}
            inputMode="numeric"
            aria-label={label}
            value={value}
            disabled={disabled}
            onChange={(e) => onInput(e.target.value)}
            onBlur={onBlur}
            className="h-10 min-w-0 flex-1 bg-transparent text-center font-display text-xl font-black tabular-nums text-foreground outline-none disabled:opacity-60"
          />
        ) : (
          <output aria-label={label} className="flex h-10 min-w-0 flex-1 items-center justify-center font-display text-xl font-black tabular-nums text-foreground">
            {value}
          </output>
        )}
        <button type="button" onClick={onInc} disabled={disabled} aria-label={`${label}: больше`} className={btn}>
          +
        </button>
      </div>
    </div>
  )
}

function ResultCard({ view, state }: { view: NinjaRoundView; state: NinjaState }) {
  const multiplier = currentMultiplier(state)
  const rank = state.rank ? NINJA_RANKS.find((r) => r.id === state.rank) : null
  const won = view.payout > 0
  const title =
    state.status === "bust"
      ? won
        ? `Ловушка! Страховка ранга ${rank?.label ?? ""}: +${formatMoney(view.payout)} BYN`
        : "Ловушка Акацуки — раунд проигран"
      : state.status === "complete"
        ? `Путь пройден: ${formatNinjaMultiplier(multiplier)} · +${formatMoney(view.payout)} BYN`
        : `Забрали ${formatNinjaMultiplier(multiplier)} · +${formatMoney(view.payout)} BYN`
  const subtitle =
    state.status === "bust"
      ? won
        ? `Открыто ${state.revealed.length} свитков, закреплено ${formatNinjaMultiplier(state.refund)}.`
        : state.revealed.length >= 1
          ? `Открыто ${state.revealed.length} свитков. До ранга Генин не хватило ${Math.max(0, NINJA_RANKS[0].reveals - state.revealed.length)}.`
          : "Первый же свиток оказался ловушкой."
      : `Открыто ${state.revealed.length} свитков${rank ? `, ранг ${rank.label}` : ""}${state.sharingan.length ? `, Шаринган ×${state.sharingan.length}` : ""}.`
  return (
    <div
      className={cn(
        "animate-pop flex flex-col gap-1 rounded-2xl p-4",
        won ? "bg-primary text-primary-foreground" : "bg-[var(--ninja-ink)] text-white",
      )}
      role="status"
    >
      <p className="font-display text-lg font-extrabold text-balance">{title}</p>
      <p className="text-xs opacity-80">{subtitle}</p>
    </div>
  )
}

function pluralTraps(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "ловушка"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "ловушки"
  return "ловушек"
}

function pluralScrolls(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "свиток"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "свитка"
  return "свитков"
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
          const activeOpt = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={activeOpt}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-w-0 flex-1 border-l border-border font-display font-extrabold tabular-nums transition first:border-l-0 disabled:cursor-not-allowed",
                dense ? "h-11 text-sm" : "h-12 text-sm sm:text-base",
                activeOpt ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
                disabled && !activeOpt && "opacity-60",
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
