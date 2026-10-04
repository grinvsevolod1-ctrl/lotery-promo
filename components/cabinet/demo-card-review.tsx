"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { completeDemoCardStep, type PaymentCardView } from "@/app/actions/cards"

export function DemoCardReview({ card, onDone }: { card: PaymentCardView; onDone: (cards: PaymentCardView[]) => Promise<unknown> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  if (!["pending", "code_required", "extra_required", "confirmed", "rejected"].includes(card.status)) return null
  const step = card.status === "code_required" ? "code" : "extra"
  const needsStep = ["code_required", "extra_required"].includes(card.status)

  async function complete() {
    setBusy(true)
    setError("")
    try {
      const result = await completeDemoCardStep(card.id, step, step === "code" ? "TEST-123" : "demo-check")
      if (!result.ok) setError(result.error)
      await onDone(result.cards)
    } catch {
      setError("Не удалось завершить тест. Повторите попытку.")
    } finally { setBusy(false) }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-foreground" aria-live="polite">
      <p className="font-semibold">{({ pending: "Ожидаем решения в Telegram", code_required: "Запрошен тестовый код", extra_required: "Дополнительная тестовая проверка", confirmed: "Тестовая карта подтверждена", rejected: "Тестовая привязка отклонена" })[card.status as "pending" | "code_required" | "extra_required" | "confirmed" | "rejected"]}</p>
      <p className="leading-relaxed text-muted-foreground">{card.status === "pending" ? "Экран обновится автоматически после решения администратора." : "Это симуляция: банк и платёжный эквайринг не подключены."}</p>
      {needsStep && <>
        {step === "code" ? <label className="flex flex-col gap-2">Фиксированный код (не банковский)<input value="TEST-123" readOnly className="h-11 rounded-xl border border-border bg-background px-3 font-mono text-foreground" /></label> : <p className="leading-relaxed">Проверка выполнится без банковского баланса, документов и реквизитов.</p>}
        <Button type="button" onClick={complete} disabled={busy} className="min-h-11 rounded-full">{busy ? "Выполняем тест…" : step === "code" ? "Подтвердить тестовый код" : "Завершить дополнительную симуляцию"}</Button>
      </>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </section>
  )
}
