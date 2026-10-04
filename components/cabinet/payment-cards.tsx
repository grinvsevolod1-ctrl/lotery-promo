"use client"

import { useState, type FormEvent } from "react"
import useSWR from "swr"
import { deletePaymentCard, requestCardBinding, setDefaultPaymentCard, type PaymentCardView } from "@/app/actions/cards"
import { reviewFetcher } from "@/lib/review-fetcher"
import { CARD_BRAND_LABEL, formatExpiry, maskCard, type CardBrand } from "@/lib/payment-cards"
import { CardBrandMark } from "@/components/cabinet/card-brand-mark"
import { EmptyState, Panel } from "@/components/cabinet/panel"
import { cn } from "@/lib/utils"

const BRAND_MATERIAL: Record<CardBrand, string> = {
  visa: "from-primary/70 via-primary/40 to-card",
  mastercard: "from-accent/70 via-primary/30 to-card",
  belkart: "from-gold/60 via-primary/30 to-card",
  mir: "from-primary/60 via-accent/40 to-card",
  other: "from-muted via-card to-card",
}

const BANKS = ["Беларусбанк", "Приорбанк", "Сбер Банк", "Белагропромбанк", "Белинвестбанк", "МТБанк", "Альфа-Банк", "Банк Дабрабыт", "Другой банк"]

export function PaymentCards({ initial }: { initial: PaymentCardView[] }) {
  const { data: cards = initial, mutate, error: fetchError } = useSWR<PaymentCardView[]>("/api/cabinet/cards", reviewFetcher, {
    fallbackData: initial,
    refreshInterval: (latest) => (latest?.some((c) => c.status === "pending") ? 15000 : 0),
  })
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

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
      {cards.length === 0 && !formOpen && <EmptyState text="У вас пока нет привязанных карт." />}
      {cards.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={card.id}>
              <CardTile
                card={card}
                busy={pendingId === card.id}
                disabled={pendingId !== null}
                onMakeDefault={() => void run(card.id, () => setDefaultPaymentCard(card.id))}
                onDelete={() => {
                  if (confirm(`Отвязать карту ${maskCard(card.last4)}?`)) void run(card.id, async () => (await deletePaymentCard(card.id)).cards)
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {(error || fetchError) && <p role="alert" className="text-sm text-destructive">{error ?? "Не удалось загрузить карты."}</p>}

      {formOpen ? (
        <BindingRequestForm
          onCancel={() => setFormOpen(false)}
          onDone={async (next) => {
            await mutate(next, false)
            setFormOpen(false)
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="group flex min-h-24 items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border/70 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5"
        >
          <span className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary transition group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
            <PlusMark className="size-5" />
          </span>
          Привязать новую карту
        </button>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground text-pretty">
        <LockMark className="mt-0.5 size-4 shrink-0 text-gold" />
        Номер карты, срок действия и CVC вводятся только на защищённой странице bePaid по ссылке из вашей заявки. Никому не сообщайте эти данные и коды из SMS.
      </p>
    </div>
  )
}

function CardTile({
  card,
  busy,
  disabled,
  onMakeDefault,
  onDelete,
}: {
  card: PaymentCardView
  busy: boolean
  disabled: boolean
  onMakeDefault: () => void
  onDelete: () => void
}) {
  const confirmed = card.status === "confirmed"
  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-foreground shadow-xl transition",
        BRAND_MATERIAL[card.brand],
        card.isDefault ? "ring-2 ring-gold" : "ring-1 ring-border",
        busy && "opacity-60",
      )}
    >
      <span aria-hidden="true" className="card-sheen pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-foreground/70">{card.bankName ?? CARD_BRAND_LABEL[card.brand]}</span>
        <div className="flex items-center gap-2">
          {card.status === "pending" && (
            <span className="rounded-full bg-foreground/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">
              {card.bindingUrl ? "Ждёт привязки" : "Готовим ссылку"}
            </span>
          )}
          {card.status === "rejected" && (
            <span className="rounded-full bg-destructive/80 px-2.5 py-1 text-xs font-semibold text-primary-foreground">Отклонена</span>
          )}
          <CardBrandMark brand={card.brand} className="h-6" />
        </div>
      </div>
      <div className="relative flex items-center gap-3">
        <span aria-hidden="true" className="card-chip h-7 w-10 rounded-md" />
        <p className="font-mono text-lg tracking-[0.12em] tabular-nums">{maskCard(card.last4)}</p>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase">{card.cardholder}</p>
          {card.expMonth && card.expYear && (
            <p className="font-mono text-xs text-foreground/70">до {formatExpiry(card.expMonth, card.expYear)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {confirmed && card.isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-gold-foreground">
              <CheckMark className="size-3.5" />
              Основная
            </span>
          )}
          {confirmed && !card.isDefault && (
            <button
              type="button"
              onClick={onMakeDefault}
              disabled={disabled}
              className="rounded-full bg-foreground/15 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-foreground/25 disabled:opacity-50"
            >
              Сделать основной
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            aria-label={`Отвязать карту ${maskCard(card.last4)}`}
            className="grid size-8 place-items-center rounded-full bg-foreground/15 backdrop-blur transition hover:bg-destructive hover:text-primary-foreground disabled:opacity-50"
          >
            <TrashMark className="size-4" />
          </button>
        </div>
      </div>
      {card.status === "pending" && (
        <div className="relative flex flex-col gap-2 rounded-2xl bg-background/60 p-3 backdrop-blur">
          {card.bindingUrl ? (
            <>
              <p className="text-xs leading-relaxed text-foreground/80">Ссылка готова. Введите данные карты на странице bePaid — после этого администратор подтвердит привязку.</p>
              <a
                href={card.bindingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Привязать карту в bePaid
              </a>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-foreground/80">Заявка у администратора. Скоро здесь появится защищённая ссылка bePaid для привязки.</p>
          )}
        </div>
      )}
    </div>
  )
}

function BindingRequestForm({ onCancel, onDone }: { onCancel: () => void; onDone: (cards: PaymentCardView[]) => Promise<void> }) {
  const [cardholder, setCardholder] = useState("")
  const [bankName, setBankName] = useState(BANKS[0])
  const [last4, setLast4] = useState("")
  const [brand, setBrand] = useState<CardBrand>("visa")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await requestCardBinding({ cardholder, bankName: bankName === "Другой банк" ? "" : bankName, last4, brand })
      if (!res.ok) setError(res.error)
      else await onDone(res.cards)
    } catch {
      setError("Не удалось отправить заявку. Попробуйте ещё раз.")
    } finally {
      setSubmitting(false)
    }
  }

  const preview: PaymentCardView = {
    id: 0, brand, last4: last4 || "0000", bankName: bankName === "Другой банк" ? null : bankName,
    cardholder: cardholder || "ИМЯ ФАМИЛИЯ", expMonth: null, expYear: null, isDefault: false, status: "preview", bindingUrl: null,
  }

  const field = "min-h-11 w-full rounded-2xl border border-border/60 bg-background/60 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"

  return (
    <Panel className="p-5">
      <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
        <div className="pointer-events-none flex flex-col justify-center" aria-hidden="true">
          <div className={cn("relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-foreground shadow-xl ring-1 ring-border", BRAND_MATERIAL[preview.brand])}>
            <span className="card-sheen absolute inset-0 opacity-40" />
            <div className="relative flex items-start justify-between">
              <span className="text-xs font-medium text-foreground/70">{preview.bankName ?? CARD_BRAND_LABEL[preview.brand]}</span>
              <CardBrandMark brand={preview.brand} className="h-6" />
            </div>
            <span className="card-chip relative h-8 w-11 rounded-md" />
            <p className="relative font-mono text-lg tracking-[0.12em] tabular-nums">{maskCard(preview.last4)}</p>
            <p className="relative truncate text-sm font-semibold uppercase">{preview.cardholder}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-foreground">Заявка на привязку карты</h2>
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            Держатель карты
            <input value={cardholder} onChange={(e) => setCardholder(e.target.value.toUpperCase())} required maxLength={60} autoComplete="cc-name" placeholder="IVAN IVANOV" className={cn(field, "uppercase")} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              Платёжная система
              <select value={brand} onChange={(e) => setBrand(e.target.value as CardBrand)} className={field}>
                {(Object.keys(CARD_BRAND_LABEL) as CardBrand[]).map((b) => <option key={b} value={b}>{CARD_BRAND_LABEL[b]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              Последние 4 цифры
              <input value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} required inputMode="numeric" pattern="\d{4}" placeholder="1234" className={cn(field, "font-mono tracking-widest")} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            Банк
            <select value={bankName} onChange={(e) => setBankName(e.target.value)} className={field}>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={submitting} className="min-h-11 flex-1 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              {submitting ? "Отправляем…" : "Отправить заявку"}
            </button>
            <button type="button" onClick={onCancel} className="min-h-11 rounded-full border border-border px-5 text-sm text-foreground">Отмена</button>
          </div>
        </div>
      </form>
    </Panel>
  )
}

function PlusMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}

function CheckMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
}

function TrashMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
}

function LockMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
}
