"use client"

import { useEffect, useRef } from "react"
import { Clock, CheckCircle2 } from "lucide-react"

export function WithdrawSuccess({ amount, destination, onClose }: { amount: number; destination: string; onClose: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    buttonRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-success-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-card p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
          <CheckCircle2 className="size-9" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 id="withdraw-success-title" className="text-balance font-display text-2xl font-extrabold text-foreground">
            Заявка в обработке
          </h2>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            Вывод <b className="text-foreground">{amount.toLocaleString("ru-RU")} BYN</b> на {destination} успешно принят.
          </p>
        </div>
        <div className="flex w-full items-center gap-3 rounded-2xl bg-muted p-4 text-left">
          <Clock className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Время обработки</p>
            <p className="text-sm text-muted-foreground">от 5 минут до 48 часов</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Сумма зарезервирована. Пришлём уведомление, как только деньги уйдут. Если заявку отклонят — сумма вернётся на баланс.
        </p>
        <button
          ref={buttonRef}
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground transition-transform active:scale-[0.97]"
        >
          Понятно
        </button>
      </div>
    </div>
  )
}
