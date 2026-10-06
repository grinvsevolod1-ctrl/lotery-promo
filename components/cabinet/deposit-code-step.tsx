"use client"

import { useEffect, useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { getDepositState, submitDepositCode } from "@/app/actions/funding"
import { fieldClass } from "@/components/ui/input"
import { actionErrorMessage } from "@/lib/action-error"
import { cn } from "@/lib/utils"

type Props = { requestId: number; amount: number; onClose: () => void }

export function DepositCodeStep({ requestId, amount, onClose }: Props) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: state, mutate } = useSWR(["deposit-state", requestId], () => getDepositState(requestId), {
    refreshInterval: (latest) => (latest && latest.status !== "pending" ? 0 : 3000),
    revalidateOnFocus: true,
  })

  const finished = state?.status === "approved" || state?.status === "rejected"
  useEffect(() => {
    if (finished) router.refresh()
  }, [finished, router])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await submitDepositCode({ id: requestId, code })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setCode("")
        await mutate()
      } catch (e) {
        setError(actionErrorMessage(e, "Не удалось отправить код. Попробуйте ещё раз."))
      }
    })
  }

  const title = `Пополнение на ${amount.toLocaleString("ru-RU")} BYN`

  if (state?.status === "approved") {
    return (
      <Result tone="ok" title="Баланс пополнен" text={`${title} подтверждено. Деньги уже на вашем балансе.`} onClose={onClose} action="Готово" />
    )
  }
  if (state?.status === "rejected" || state?.status === "missing") {
    return (
      <Result
        tone="error"
        title="Пополнение не прошло"
        text={state.note ? `Причина: ${state.note}` : "Списание не удалось подтвердить. Попробуйте другую карту или сумму."}
        onClose={onClose}
        action="Вернуться"
      />
    )
  }

  if (state?.codeStatus === "submitted") {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 rounded-3xl bg-muted p-6 text-center">
        <span className="size-8 animate-spin rounded-full border-4 border-primary/25 border-t-primary" aria-hidden="true" />
        <h3 className="font-display text-lg font-extrabold text-foreground">Проверяем код</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {title}. Код отправлен, дождитесь подтверждения банка — страница обновится сама.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl bg-muted p-5">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-extrabold text-foreground">Введите код подтверждения</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {title}. Банк отправил код в SMS или в приложение — введите его, чтобы завершить оплату.
        </p>
      </div>
      <label className="sr-only" htmlFor="deposit-code">Код подтверждения</label>
      <input
        id="deposit-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\w-]/g, "").slice(0, 20))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="Код из SMS"
        className={cn(fieldClass, "text-center font-mono text-2xl tracking-[0.3em] tabular-nums")}
      />
      {error && <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={pending || code.length < 3}
        className="h-14 rounded-full bg-primary text-[17px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Отправляем…" : "Подтвердить"}
      </button>
    </form>
  )
}

function Result({ tone, title, text, action, onClose }: { tone: "ok" | "error"; title: string; text: string; action: string; onClose: () => void }) {
  return (
    <div role={tone === "ok" ? "status" : "alert"} className="flex flex-col items-start gap-3 rounded-3xl bg-muted p-5">
      <h3 className={cn("font-display text-lg font-extrabold", tone === "ok" ? "text-foreground" : "text-destructive")}>{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition active:scale-[0.97]"
      >
        {action}
      </button>
    </div>
  )
}
