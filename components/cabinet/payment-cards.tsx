"use client"

import { useState } from "react"
import useSWR from "swr"
import { deletePaymentCard, setDefaultPaymentCard, type PaymentCardView } from "@/app/actions/cards"
import { reviewFetcher } from "@/lib/review-fetcher"
import { CARD_BRAND_LABEL, formatExpiry, maskCard } from "@/lib/payment-cards"
import { CardBrandMark } from "@/components/cabinet/card-brand-mark"
import { EmptyState, Panel } from "@/components/cabinet/panel"

export function PaymentCards({ initial }: { initial: PaymentCardView[] }) {
  const { data: cards = initial, mutate, error: fetchError } = useSWR<PaymentCardView[]>("/api/cabinet/cards", reviewFetcher, { fallbackData: initial })
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(id: number, action: () => Promise<PaymentCardView[]>) {
    setPendingId(id)
    setError(null)
    try {
      await mutate(await action(), false)
    } catch {
      setError("Не удалось выполнить действие. Попробуйте ещё раз.")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {cards.length === 0 ? <EmptyState text="У вас пока нет привязанных карт." /> : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={card.id}>
              <Panel className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{card.bankName ?? CARD_BRAND_LABEL[card.brand]}</p>
                  <CardBrandMark brand={card.brand} className="h-6" />
                </div>
                <p className="font-mono text-lg text-foreground">{maskCard(card.last4)}</p>
                <p className="text-sm text-muted-foreground">{card.cardholder} · до {formatExpiry(card.expMonth, card.expYear)}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {card.isDefault ? <span className="text-sm font-semibold text-primary">Основная</span> : (
                    <button type="button" disabled={pendingId !== null} onClick={() => void run(card.id, () => setDefaultPaymentCard(card.id))} className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Сделать основной</button>
                  )}
                  <button type="button" disabled={pendingId !== null} onClick={() => {
                    if (confirm(`Отвязать карту ${maskCard(card.last4)}?`)) void run(card.id, async () => (await deletePaymentCard(card.id)).cards)
                  }} className="min-h-11 rounded-full border border-border px-4 text-sm text-foreground disabled:opacity-50">Отвязать</button>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
      {(error || fetchError) && <p role="alert" className="text-sm text-destructive">{error ?? "Не удалось загрузить карты."}</p>}
      <Panel className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-lg font-bold text-foreground">Привязка банковской карты</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Платёжный провайдер пока не подключён. После подключения вы сможете самостоятельно привязать карту на его защищённой странице. Сайт не запрашивает номер карты, CVC и банковские коды.</p>
        <button type="button" disabled className="min-h-12 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground opacity-50">Привязать карту — пока недоступно</button>
      </Panel>
    </div>
  )
}
