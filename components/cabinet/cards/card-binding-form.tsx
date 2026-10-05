"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { requestCardBinding, type PaymentCardView } from "@/app/actions/cards"
import { detectBrand, formatCardNumber, isExpiryValid, luhnValid, normalizeCardNumber, parseExpiry } from "@/lib/payment-cards"
import { CardBrandMark } from "@/components/cabinet/card-brand-mark"
import { Panel } from "@/components/cabinet/panel"
import { fieldClass } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { actionErrorMessage } from "@/lib/action-error"
import { toCardholder } from "@/lib/translit"
import { Spinner } from "./card-icons"
import { BRAND_MATERIAL } from "./card-tile"

const REDIRECT_DELAY_MS = 1400
const invalidField = "border-destructive focus:border-destructive focus:ring-destructive/30"

export function CardBindingForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (cards: PaymentCardView[]) => Promise<void> }) {
  const router = useRouter()
  const [cardholder, setCardholder] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [showCvc, setShowCvc] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savedCardId, setSavedCardId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (savedCardId === null) return
    router.prefetch(`/cabinet/cards/${savedCardId}`)
    const timer = setTimeout(() => router.push(`/cabinet/cards/${savedCardId}`), REDIRECT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [savedCardId, router])

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
    if (!numberComplete || numberInvalid) return setError("Проверьте номер карты — нужно 16 цифр.")
    if (!parsedExpiry || expiryInvalid) return setError("Проверьте срок действия карты (ММ/ГГ).")
    if (!cvcComplete) return setError("Укажите код CVC/CVV с обратной стороны карты.")
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
      if (!res.ok) {
        setError(res.error)
        return
      }
      await onSaved(res.cards)
      setSavedCardId(res.cardId)
    } catch (err) {
      setError(actionErrorMessage(err, "Не удалось сохранить карту. Проверьте интернет и попробуйте ещё раз."))
    } finally {
      setSubmitting(false)
    }
  }

  function onExpiryChange(value: string) {
    const raw = value.replace(/\D/g, "").slice(0, 4)
    setExpiry(raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw)
  }

  if (savedCardId !== null) {
    return (
      <Panel className="p-5 sm:p-6">
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-5 py-10 text-center">
          <span className="relative grid size-16 place-items-center rounded-full bg-primary/10">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/15 [animation-duration:1.8s]" />
            <Spinner className="size-7 text-primary" />
          </span>
          <div className="flex max-w-xs flex-col gap-2">
            <p className="font-display text-xl font-extrabold text-balance">Карта сохранена</p>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              Ожидайте перенаправления на страницу подтверждения вашей карты.
            </p>
          </div>
        </div>
      </Panel>
    )
  }

  const previewNumber = (digits + "•".repeat(16 - digits.length)).replace(/(.{4})/g, "$1 ").trim()

  return (
    <Panel className="p-5 sm:p-6">
      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="pointer-events-none mx-auto w-full max-w-sm [perspective:1400px] lg:mx-0 lg:max-w-none" aria-hidden="true">
          <div
            className={cn(
              "relative aspect-[1.586] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] [transform-style:preserve-3d]",
              showCvc && "[transform:rotateY(180deg)]",
            )}
          >
            <div className={cn("absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[18px] bg-gradient-to-br p-5 text-foreground shadow-2xl ring-1 ring-border [backface-visibility:hidden]", BRAND_MATERIAL[brand])}>
              <span className="card-sheen absolute inset-0 opacity-40" />
              <div className="relative flex items-start justify-between">
                <span className="card-chip h-8 w-11 rounded-[6px]" />
                <CardBrandMark brand={brand} className="h-6" />
              </div>
              <p className="relative font-mono text-lg tracking-[0.12em] tabular-nums sm:text-xl">{previewNumber}</p>
              <div className="relative flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-medium uppercase tracking-widest text-foreground/55">Держатель</p>
                  <p className="truncate text-sm font-semibold uppercase">{cardholder || "ИМЯ ФАМИЛИЯ"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-medium uppercase tracking-widest text-foreground/55">Срок</p>
                  <p className="font-mono text-sm tabular-nums">{expiryClean || "ММ/ГГ"}</p>
                </div>
              </div>
            </div>
            <div className={cn("absolute inset-0 flex flex-col overflow-hidden rounded-[18px] bg-gradient-to-br text-foreground shadow-2xl ring-1 ring-border [backface-visibility:hidden] [transform:rotateY(180deg)]", BRAND_MATERIAL[brand])}>
              <span className="mt-[9%] h-[18%] w-full bg-foreground/85" />
              <div className="mx-5 mt-[7%] flex items-center gap-3">
                <span className="h-9 flex-1 rounded-[6px] bg-[repeating-linear-gradient(135deg,var(--color-background)_0_6px,var(--color-muted)_6px_12px)] opacity-90" />
                <span className="grid h-9 min-w-16 place-items-center rounded-[6px] bg-background px-3 font-mono text-base font-semibold tabular-nums text-foreground ring-2 ring-primary">
                  {cvcDigits || "CVC"}
                </span>
              </div>
              <p className="mx-5 mb-4 mt-auto text-[10px] leading-snug text-foreground/60">Три цифры на обороте карты. Мы передаём их только защищённо.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <h2 className="font-display text-lg font-bold text-foreground">Новая карта</h2>
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
              className={cn(fieldClass, "font-mono text-lg tracking-widest tabular-nums", numberInvalid && invalidField)}
            />
            {numberInvalid && <span className="text-xs text-destructive">Номер карты введён с ошибкой</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            Держатель карты
            <input value={cardholder} onChange={(e) => setCardholder(toCardholder(e.target.value))} required maxLength={60} autoComplete="cc-name" autoCapitalize="characters" spellCheck={false} placeholder="IVAN IVANOV" className={cn(fieldClass, "uppercase tracking-wide")} />
            <span className="text-xs">Можно писать по-русски — переведём в латиницу, как на карте.</span>
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
                className={cn(fieldClass, "text-center font-mono tabular-nums", expiryInvalid && invalidField)}
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
                className={cn(fieldClass, "text-center font-mono tabular-nums", cvcInvalid && invalidField)}
              />
            </label>
          </div>
          {expiryInvalid && <span className="text-xs text-destructive">Проверьте срок действия карты</span>}
          {cvcInvalid && <span className="text-xs text-destructive">Код CVC должен содержать 3–4 цифры</span>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={submitting} className="min-h-14 flex-1 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
              {submitting ? "Сохраняем…" : "Сохранить"}
            </button>
            <button type="button" onClick={onCancel} className="min-h-14 rounded-full border border-border px-5 text-base text-foreground transition active:scale-[0.98]">Отмена</button>
          </div>
        </div>
      </form>
    </Panel>
  )
}
