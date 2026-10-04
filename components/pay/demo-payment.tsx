"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { completeDemoDeposit, getDemoDeposit } from "@/app/actions/funding"
import useSWR from "swr"

export function DemoPayment({ initial }: { initial: { id: number; amount: number; status: string } }) {
  const router = useRouter()
  const { data: request, mutate, error: statusError } = useSWR(["demo-deposit", initial.id], () => getDemoDeposit(initial.id), {
    fallbackData: initial,
    refreshInterval: (data) => data && ["pending", "awaiting_payment"].includes(data.status) ? 3000 : 0,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function complete() {
    setBusy(true)
    setError("")
    try {
      const result = await completeDemoDeposit(initial.id)
      if (!result.ok) { setError(result.error); await mutate(); return }
      router.replace("/cabinet")
      router.refresh()
    } catch {
      setError("Не удалось завершить симуляцию. Повторите попытку.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 font-sans text-foreground">
      <section className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-border bg-card p-6" aria-labelledby="demo-payment-title">
        <p className="text-sm font-semibold text-primary">ToLoto · только симуляция</p>
        <h1 id="demo-payment-title" className="text-balance text-2xl font-bold">Тестовое пополнение #{initial.id}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">Это не платёжная форма банка. Деньги не списываются. Карта, CVC, банковские коды и баланс не запрашиваются.</p>
        <p className="text-xl font-semibold">{initial.amount} условных единиц</p>
        {request?.status === "awaiting_payment" ? (
          <button type="button" onClick={complete} disabled={busy || Boolean(statusError)} className="min-h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Завершаем тест…" : "Симулировать успешную оплату"}</button>
        ) : <p role="status" className="text-sm leading-relaxed">{request?.status === "approved" ? "Тест уже завершён. Повторное зачисление невозможно." : "Тестовая ссылка не выдана или заявка отклонена."}</p>}
        {statusError && <div className="flex flex-col gap-2" role="alert">
          <p className="text-sm text-destructive">Не удалось проверить актуальный статус заявки. Завершение теста временно недоступно.</p>
          <button type="button" onClick={() => { void mutate().catch(() => undefined) }} className="min-h-11 self-start rounded-full border border-border px-4 text-sm font-semibold">Проверить статус ещё раз</button>
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Link href="/cabinet" className="flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold">Вернуться в кабинет</Link>
      </section>
    </main>
  )
}
