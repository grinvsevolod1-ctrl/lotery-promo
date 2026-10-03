"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/confetti"
import { CoinMark } from "@/components/icons"
import { Wheel, type WheelHandle } from "@/components/wheel"
import { Notice, Panel, PanelTitle } from "@/components/cabinet/panel"
import { spinWheel } from "@/app/actions/cabinet"
import { WHEEL_SEGMENTS, nextMinskMidnight } from "@/lib/lottery"

const LABELS = WHEEL_SEGMENTS.map((s) => s.label)

function useCountdownTo(target: () => number) {
  const [text, setText] = useState("")
  useEffect(() => {
    const update = () => {
      const ms = Math.max(0, target() - Date.now())
      const h = Math.floor(ms / 3_600_000)
      const m = Math.floor((ms % 3_600_000) / 60_000)
      setText(`${h} ч ${String(m).padStart(2, "0")} мин`)
    }
    update()
    const id = window.setInterval(update, 30_000)
    return () => window.clearInterval(id)
  }, [target])
  return text
}

export function DailySpin({
  spunToday,
  todaySegment,
  todayAmount,
}: {
  spunToday: boolean
  todaySegment: number | null
  todayAmount: number | null
}) {
  const router = useRouter()
  const wheelRef = useRef<WheelHandle>(null)
  const [spinning, setSpinning] = useState(false)
  const [done, setDone] = useState(spunToday)
  const [won, setWon] = useState<number | null>(spunToday ? todayAmount : null)
  const [error, setError] = useState<string | null>(null)
  const [confettiKey, setConfettiKey] = useState(0)
  const untilNext = useCountdownTo(() => nextMinskMidnight().getTime())

  const spin = async () => {
    if (spinning || done || !wheelRef.current) return
    setSpinning(true)
    setError(null)
    let res: Awaited<ReturnType<typeof spinWheel>>
    try {
      res = await spinWheel()
    } catch {
      setSpinning(false)
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.")
      return
    }
    if (!res.ok) {
      setSpinning(false)
      setDone(true)
      setError(res.error)
      return
    }
    await wheelRef.current.spinTo(res.segment)
    setSpinning(false)
    setDone(true)
    setWon(res.amount)
    setConfettiKey((k) => k + 1)
    router.refresh()
  }

  return (
    <Panel className="p-5 sm:p-6" accent>
      <Confetti fireKey={confettiKey} />
      <PanelTitle icon={<CoinMark className="size-5" />}>Ежедневный спин</PanelTitle>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <Wheel ref={wheelRef} labels={LABELS} size={240} initialIndex={spunToday ? todaySegment : null} className="shrink-0" />

        <div className="flex w-full flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          {won !== null && done && !spinning ? (
            <>
              <p className="font-display text-2xl font-extrabold text-shimmer" role="status">
                +{won} BYN
              </p>
              <p className="text-sm text-muted-foreground">
                Бонус зачислен на баланс. Следующий спин через {untilNext}.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-pretty">
                Один бесплатный спин в день. Каждый сектор — реальные бонусы на ваш баланс: от 1 до 20 BYN.
              </p>
              <Button
                type="button"
                onClick={spin}
                disabled={spinning || done}
                size="lg"
                className="cta-shine w-full font-bold sm:w-auto"
              >
                {spinning ? "Крутится..." : done ? "Уже крутили сегодня" : "Крутить колесо"}
              </Button>
            </>
          )}
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      </div>
    </Panel>
  )
}
