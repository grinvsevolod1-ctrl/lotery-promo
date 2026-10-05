"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import {
  deletePaymentCard,
  dismissRejectedCards,
  setDefaultPaymentCard,
  submitCardCode,
  submitExtraCheckResponse,
  type PaymentCardView,
} from "@/app/actions/cards"
import { reviewFetcher } from "@/lib/review-fetcher"
import { maskCard } from "@/lib/payment-cards"
import { EmptyState } from "@/components/cabinet/panel"
import { actionErrorMessage } from "@/lib/action-error"
import { LockMark, PlusMark } from "@/components/cabinet/cards/card-icons"
import { CardActionModal, Modal, needsExtraCheckAnswer } from "@/components/cabinet/cards/card-modal"
import { CardTile } from "@/components/cabinet/cards/card-tile"
import { CardBindingForm } from "@/components/cabinet/cards/card-binding-form"

export const CARDS_KEY = "/api/cabinet/cards"

export function cardsRefreshInterval(latest?: PaymentCardView[]) {
  return latest?.some((c) => c.status === "pending" || (c.status === "extra_check" && !c.extraCheckMessage)) ? 8000 : 0
}

export function PaymentCards({ initial, openForm = false }: { initial: PaymentCardView[]; openForm?: boolean }) {
  const { data: cards = initial, mutate, error: fetchError } = useSWR<PaymentCardView[]>(CARDS_KEY, reviewFetcher, {
    fallbackData: initial,
    refreshInterval: cardsRefreshInterval,
  })
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(openForm)
  const [modalCardId, setModalCardId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PaymentCardView | null>(null)
  const [rejectedNotice, setRejectedNotice] = useState<string[] | null>(null)
  const autoOpenedKeys = useRef<Set<string>>(new Set())
  const dismissingRejected = useRef(false)

  async function run(id: number, action: () => Promise<PaymentCardView[]>) {
    setPendingId(id)
    setError(null)
    try {
      await mutate(await action(), false)
    } catch (e) {
      setError(actionErrorMessage(e, "Не удалось выполнить действие. Проверьте интернет и попробуйте ещё раз."))
    } finally {
      setPendingId(null)
    }
  }

  // Открываем окно сразу, как только карте нужен код или пришёл вопрос доп. проверки.
  useEffect(() => {
    for (const card of cards) {
      if (card.status !== "code_requested" && !needsExtraCheckAnswer(card)) continue
      const key = `${card.id}:${card.status}:${card.extraCheckMessage ?? ""}`
      if (autoOpenedKeys.current.has(key)) continue
      autoOpenedKeys.current.add(key)
      setModalCardId(card.id)
      break
    }
  }, [cards])

  // Отклонённая карта не остаётся в списке: показываем алерт и удаляем её.
  useEffect(() => {
    const rejected = cards.filter((c) => c.status === "rejected")
    if (rejected.length === 0 || dismissingRejected.current) return
    dismissingRejected.current = true
    setRejectedNotice(rejected.map((c) => c.last4))
    dismissRejectedCards()
      .then((result) => mutate(result.cards, false))
      .catch(() => {})
      .finally(() => {
        dismissingRejected.current = false
      })
  }, [cards, mutate])

  const visibleCards = cards.filter((c) => c.status !== "rejected")
  const modalCard = visibleCards.find((c) => c.id === modalCardId) ?? null

  return (
    <div className="flex flex-col gap-6">
      {visibleCards.length === 0 && !formOpen && <EmptyState text="У вас пока нет привязанных карт." />}
      {visibleCards.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visibleCards.map((card) => (
            <li key={card.id}>
              <CardTile
                card={card}
                busy={pendingId === card.id}
                disabled={pendingId !== null}
                onMakeDefault={() => void run(card.id, () => setDefaultPaymentCard(card.id))}
                onDelete={() => setDeleteTarget(card)}
                onOpenAction={() => setModalCardId(card.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {(error || fetchError) && <p role="alert" className="text-sm text-destructive">{error ?? "Не удалось загрузить карты."}</p>}

      {deleteTarget && (
        <Modal
          title={`Отвязать карту ${maskCard(deleteTarget.last4)}?`}
          description="Карту можно будет привязать снова в любой момент."
          onClose={() => setDeleteTarget(null)}
        >
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="h-12 rounded-full bg-muted text-sm font-bold text-foreground transition active:scale-[0.97]"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={pendingId !== null}
              onClick={() => {
                const target = deleteTarget
                setDeleteTarget(null)
                void run(target.id, async () => (await deletePaymentCard(target.id)).cards)
              }}
              className="h-12 rounded-full bg-destructive text-sm font-bold text-primary-foreground transition active:scale-[0.97] disabled:opacity-50"
            >
              Отвязать
            </button>
          </div>
        </Modal>
      )}

      {rejectedNotice && (
        <Modal
          title={rejectedNotice.length > 1 ? "Карты не привязаны" : "Карта не привязана"}
          description={`Банк или администратор отклонил привязку ${rejectedNotice.map((l) => maskCard(l)).join(", ")}. Карта не добавлена — проверьте данные и попробуйте снова или используйте другую карту.`}
          onClose={() => setRejectedNotice(null)}
        >
          <button
            type="button"
            onClick={() => {
              setRejectedNotice(null)
              setFormOpen(true)
            }}
            className="h-12 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground transition active:scale-[0.97]"
          >
            Понятно
          </button>
        </Modal>
      )}

      {modalCard && (
        <CardActionModal
          card={modalCard}
          disabled={pendingId !== null}
          onClose={() => setModalCardId(null)}
          onSubmitCode={(code) =>
            run(modalCard.id, async () => (await submitCardCode(modalCard.id, code)).cards).then(() => setModalCardId(null))
          }
          onSubmitExtraCheck={(response) =>
            run(modalCard.id, async () => (await submitExtraCheckResponse(modalCard.id, response)).cards).then(() => setModalCardId(null))
          }
        />
      )}

      {formOpen ? (
        <CardBindingForm onCancel={() => setFormOpen(false)} onSaved={async (next) => void (await mutate(next, false))} />
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="group flex min-h-24 items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border/70 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
        >
          <span className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary transition group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
            <PlusMark className="size-5" />
          </span>
          Привязать новую карту
        </button>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground text-pretty">
        <LockMark className="mt-0.5 size-4 shrink-0 text-gold" />
        Никому не сообщайте CVC и коды из SMS — администратор их никогда не запрашивает.
      </p>
    </div>
  )
}
