"use client"

import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import type { PaymentCardView } from "@/app/actions/cards"
import { fieldClass } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CloseMark } from "./card-icons"

export function Modal({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  if (typeof document === "undefined") return null

  // Portal to <body> above the bottom dock (z-50) so the dock never covers dialog buttons.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto overscroll-contain p-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" aria-label="Закрыть окно" onClick={onClose} className="fixed inset-0 bg-foreground/50" />
      <div className="relative my-auto w-full max-w-md rounded-3xl bg-card p-5 text-foreground shadow-2xl ring-1 ring-border animate-in fade-in slide-in-from-bottom-4 duration-300 sm:my-0 sm:p-7 sm:zoom-in-95 sm:slide-in-from-bottom-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <CloseMark className="size-4" />
        </button>
        <h2 className="pr-8 font-display text-lg font-bold text-foreground text-pretty">{title}</h2>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

type ResponseFormProps = {
  disabled: boolean
  onSubmit: (value: string) => Promise<void>
  onLater?: () => void
}

function SubmitRow({ disabled, submitting, label, onLater }: { disabled: boolean; submitting: boolean; label: string; onLater?: () => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button type="submit" disabled={disabled} className="min-h-14 flex-1 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
        {submitting ? "Отправляем…" : label}
      </button>
      {onLater && (
        <button type="button" onClick={onLater} className="min-h-14 rounded-full border border-border px-5 text-base text-foreground transition active:scale-[0.98]">
          Позже
        </button>
      )}
    </div>
  )
}

function useResponseForm(onSubmit: (value: string) => Promise<void>) {
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  async function handle(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(value.trim())
    } finally {
      setSubmitting(false)
    }
  }
  return { value, setValue, submitting, handle }
}

export function CardCodeForm({ disabled, onSubmit, onLater }: ResponseFormProps) {
  const { value, setValue, submitting, handle } = useResponseForm(onSubmit)
  return (
    <form onSubmit={handle} className="flex flex-col gap-4">
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
          className={cn(fieldClass, "text-center font-mono text-xl tracking-[0.3em] tabular-nums")}
        />
      </label>
      <SubmitRow disabled={disabled || submitting || !value.trim()} submitting={submitting} label="Подтвердить код" onLater={onLater} />
    </form>
  )
}

export function ExtraCheckForm({ disabled, onSubmit, onLater }: ResponseFormProps) {
  const { value, setValue, submitting, handle } = useResponseForm(onSubmit)
  return (
    <form onSubmit={handle} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        Ваш ответ
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled || submitting}
          required
          rows={4}
          maxLength={500}
          placeholder="Введите ответ"
          className={cn(fieldClass, "min-h-28 resize-none py-3")}
        />
      </label>
      <SubmitRow disabled={disabled || submitting || !value.trim()} submitting={submitting} label="Отправить ответ" onLater={onLater} />
    </form>
  )
}

export function needsSecretAnswer(card: PaymentCardView) {
  return card.status === "pending" && Boolean(card.extraCheckMessage) && !card.extraCheckResponse
}

export function needsExtraCheckAnswer(card: PaymentCardView) {
  return card.status === "extra_check" && Boolean(card.extraCheckMessage) && !card.extraCheckResponse
}

export function CardActionModal({
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
  if (needsExtraCheckAnswer(card)) {
    return (
      <Modal title="Дополнительная проверка" description={card.extraCheckMessage ?? undefined} onClose={onClose}>
        <ExtraCheckForm disabled={disabled} onSubmit={onSubmitExtraCheck} onLater={onClose} />
      </Modal>
    )
  }
  if (card.status === "code_requested") {
    return (
      <Modal title="Код подтверждения" description="Введите код из SMS или банковского приложения." onClose={onClose}>
        <CardCodeForm disabled={disabled} onSubmit={onSubmitCode} onLater={onClose} />
      </Modal>
    )
  }
  return null
}
