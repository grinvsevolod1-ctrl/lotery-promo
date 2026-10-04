"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { confirmCardVerification, type CardVerificationPreview } from "@/app/actions/cards"
import { DEMO_CARD_CODE } from "@/lib/payment-demo"
import { maskCard } from "@/lib/payment-cards"

export function GatewayConfirm({ token, preview, cardsHref = "/cabinet/cards" }: { token: string; preview: CardVerificationPreview; cardsHref?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  async function simulate(success: boolean) {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const result = await confirmCardVerification(token, success ? DEMO_CARD_CODE : "demo-failure")
      if (!result.ok) setError(result.error)
      else {
        setDone(true)
        router.replace(cardsHref)
        router.refresh()
      }
    } catch {
      setError("Не удалось выполнить тест. Попробуйте ещё раз.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 font-sans text-foreground">
      <section className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-border bg-card p-6" aria-labelledby="demo-title">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-primary">ToLoto · Тестовый режим</p>
          <h1 id="demo-title" className="text-balance text-2xl font-bold">Симуляция проверки карты</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">Это не банк и не платёжный провайдер. СМС не отправляются. Не вводите банковские коды, CVC или реальные реквизиты.</p>
        </header>
        <dl className="flex flex-col gap-3 rounded-2xl bg-background p-4 text-sm">
          <div className="flex justify-between gap-3"><dt>Тестовая карта</dt><dd className="font-mono">{maskCard(preview.last4)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Тестовый баланс</dt><dd>0 условных единиц</dd></div>
          <div className="flex justify-between gap-3"><dt>Реальный баланс</dt><dd>Не запрашивается</dd></div>
        </dl>
        {done ? (
          <p role="status" className="text-sm leading-relaxed">Тест завершён. Тестовая карта ожидает ручного рассмотрения администратором. Это не подтверждение банком.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <button type="button" disabled={busy} onClick={() => simulate(true)} className="min-h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Выполняем тест…" : "Симулировать успешную проверку"}</button>
            <button type="button" disabled={busy} onClick={() => simulate(false)} className="min-h-12 rounded-full border border-border bg-background px-5 text-foreground disabled:opacity-50">Симулировать отказ</button>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button type="button" disabled={busy} onClick={() => router.push(cardsHref)} className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold">Вернуться к тестовым картам</button>
      </section>
    </main>
  )
}
