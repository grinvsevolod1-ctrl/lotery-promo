"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import {
  addPaymentCard,
  deletePaymentCard,
  setDefaultPaymentCard,
  type PaymentCardView,
} from "@/app/actions/cards"
import {
  CARD_BRAND_LABEL,
  type CardBrand,
  detectBank,
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isExpiryValid,
  luhnValid,
  maskCard,
  normalizeCardNumber,
  parseExpiry,
} from "@/lib/payment-cards"
import { CardBrandMark } from "@/components/cabinet/card-brand-mark"
import { CheckMark, KeyMark, PlusMark, ShieldMark, TrashMark } from "@/components/icons"
import { cn } from "@/lib/utils"

const BRAND_MATERIAL: Record<CardBrand, string> = {
  visa: "from-[oklch(0.42_0.16_262)] via-[oklch(0.28_0.12_270)] to-[oklch(0.17_0.07_280)]",
  mastercard: "from-[oklch(0.5_0.19_35)] via-[oklch(0.32_0.14_20)] to-[oklch(0.18_0.07_350)]",
  belkart: "from-[oklch(0.48_0.13_160)] via-[oklch(0.3_0.1_175)] to-[oklch(0.17_0.05_200)]",
  mir: "from-[oklch(0.5_0.14_150)] via-[oklch(0.3_0.1_210)] to-[oklch(0.17_0.06_260)]",
  other: "from-primary via-[oklch(0.35_0.16_320)] to-background",
}

const fieldClass =
  "h-12 w-full rounded-2xl border border-border bg-background/60 px-4 text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"

export function PaymentCards({ initial }: { initial: PaymentCardView[] }) {
  const [cards, setCards] = useState(initial)
  const [adding, setAdding] = useState(initial.length === 0)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function run(id: number, action: () => Promise<PaymentCardView[]>) {
    setPendingId(id)
    setActionError(null)
    startTransition(async () => {
      try {
        setCards(await action())
      } catch {
        setActionError("Не удалось выполнить действие. Попробуйте ещё раз.")
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {cards.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <li key={c.id}>
              <CardTile
                card={c}
                busy={pendingId === c.id}
                onMakeDefault={() => run(c.id, () => setDefaultPaymentCard(c.id))}
                onDelete={() => {
                  if (!confirm(`Отвязать карту ${maskCard(c.last4)}?`)) return
                  run(c.id, async () => (await deletePaymentCard(c.id)).cards)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {adding ? (
        <AddCardForm
          onCancel={cards.length > 0 ? () => setAdding(false) : undefined}
          onAdded={(next) => {
            setCards(next)
            setAdding(false)
          }}
        />
      ) : (
        cards.length < 5 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="group flex items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card/30 p-6 font-semibold text-foreground/80 transition hover:border-primary/60 hover:bg-primary/5 hover:text-foreground"
          >
            <span className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary transition group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
              <PlusMark className="size-5" />
            </span>
            Привязать новую карту
          </button>
        )
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground text-pretty">
        <KeyMark className="mt-0.5 size-4 shrink-0 text-gold" />
        Полный номер карты и CVC не сохраняются. В кабинете видны только последние 4 цифры, а повторная привязка
        той же карты определяется по зашифрованному отпечатку.
      </p>
    </div>
  )
}

function CardTile({
  card,
  busy,
  onMakeDefault,
  onDelete,
}: {
  card: PaymentCardView
  busy: boolean
  onMakeDefault: () => void
  onDelete: () => void
}) {
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
        <CardBrandMark brand={card.brand} className="h-6" />
      </div>
      <p className="relative font-mono text-lg tracking-[0.12em] tabular-nums">{maskCard(card.last4)}</p>
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase">{card.cardholder}</p>
          <p className="font-mono text-xs text-foreground/70">до {formatExpiry(card.expMonth, card.expYear)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {card.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-gold-foreground">
              <CheckMark className="size-3.5" />
              Основная
            </span>
          ) : (
            <button
              type="button"
              onClick={onMakeDefault}
              disabled={busy}
              className="rounded-full bg-foreground/15 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-foreground/25 disabled:opacity-50"
            >
              Сделать основной
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label={`Отвязать карту ${maskCard(card.last4)}`}
            className="grid size-8 place-items-center rounded-full bg-foreground/15 backdrop-blur transition hover:bg-destructive hover:text-primary-foreground disabled:opacity-50"
          >
            <TrashMark className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Live preview: flips to the back while CVC is focused and tilts toward the
 * pointer with a moving holographic sheen.
 */
function CardPreview({
  number,
  cardholder,
  expiry,
  cvc,
  brand,
  bank,
  flipped,
}: {
  number: string
  cardholder: string
  expiry: string
  cvc: string
  brand: CardBrand
  bank: string | null
  flipped: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = formatCardNumber(number).padEnd(19, "•").replace(/(.{4})(?! )/g, "$1 ").slice(0, 19)

  function tilt(e: ReactPointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || e.pointerType !== "mouse") return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty("--rx", `${(0.5 - y) * 14}deg`)
    el.style.setProperty("--ry", `${(x - 0.5) * 18}deg`)
    el.style.setProperty("--mx", `${x * 100}%`)
    el.style.setProperty("--my", `${y * 100}%`)
  }

  function reset() {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--rx", "0deg")
    el.style.setProperty("--ry", "0deg")
  }

  return (
    <div ref={ref} onPointerMove={tilt} onPointerLeave={reset} className="card-stage [perspective:1400px]">
      <div
        className={cn(
          "card-tilt relative aspect-[1.586/1] w-full transition-transform duration-700 [transform-style:preserve-3d]",
          flipped && "is-flipped",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-foreground shadow-2xl shadow-primary/30 ring-1 ring-foreground/15 transition-colors duration-500 [backface-visibility:hidden] sm:p-6",
            BRAND_MATERIAL[brand],
          )}
        >
          <span aria-hidden="true" className="card-sheen pointer-events-none absolute inset-0" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-2">
              <span aria-hidden="true" className="card-chip h-8 w-11 rounded-lg" />
              <span className="h-4 max-w-40 truncate text-xs font-medium text-foreground/75">{bank ?? ""}</span>
            </div>
            <CardBrandMark brand={brand} className="h-7" />
          </div>
          <p className="relative whitespace-nowrap font-mono text-[clamp(1rem,5vw,1.4rem)] tracking-[0.1em] tabular-nums [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]">
            {shown}
          </p>
          <div className="relative flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-foreground/60">Держатель</p>
              <p className="truncate text-sm font-semibold uppercase">{cardholder || "IVAN IVANOV"}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-widest text-foreground/60">Действует до</p>
              <p className="font-mono text-sm">{expiry || "ММ/ГГ"}</p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br pt-6 pb-5 text-foreground shadow-2xl ring-1 ring-foreground/15 [backface-visibility:hidden] [transform:rotateY(180deg)]",
            BRAND_MATERIAL[brand],
          )}
        >
          <div className="h-10 w-full bg-background/80" aria-hidden="true" />
          <div className="flex flex-1 flex-col justify-center gap-1.5 px-5 sm:px-6">
            <p className="text-[10px] uppercase tracking-widest text-foreground/60">CVC / CVV</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg bg-foreground px-3 py-2 text-right font-mono text-sm tracking-[0.35em] text-background">
                {cvc ? "•".repeat(cvc.length) : "•••"}
              </div>
              <CardBrandMark brand={brand} className="h-5" />
            </div>
            <p className="text-[11px] text-foreground/70">Три цифры на обороте. Мы их не храним.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddCardForm({ onAdded, onCancel }: { onAdded: (cards: PaymentCardView[]) => void; onCancel?: () => void }) {
  const [number, setNumber] = useState("")
  const [cardholder, setCardholder] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [flipped, setFlipped] = useState(false)
  const [error, setError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [busy, setBusy] = useState(false)

  const digits = normalizeCardNumber(number)
  const brand = detectBrand(number)
  const bank = digits.length >= 6 ? detectBank(number) : null
  const numberOk = digits.length >= 13 && luhnValid(digits)
  const exp = parseExpiry(expiry)
  const expiryOk = Boolean(exp && isExpiryValid(exp.month, exp.year))
  const holderOk = /^[A-Z][A-Z .'-]{2,}$/.test(cardholder.trim())
  const cvcOk = cvc.length >= 3
  const progress = [numberOk, holderOk, expiryOk, cvcOk].filter(Boolean).length

  function validate() {
    if (!numberOk) return "Проверьте номер карты — он введён неверно."
    if (!holderOk) return "Имя держателя — латиницей, как на карте."
    if (!exp) return "Укажите срок действия в формате ММ/ГГ."
    if (!expiryOk) return "Срок действия карты истёк."
    if (!cvcOk) return "Введите код CVC (3 цифры на обороте)."
    return null
  }

  function proceed(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    setError(err ?? "")
    if (!err) setVerifying(true)
  }

  async function confirm3DS() {
    setBusy(true)
    setError("")
    try {
      const res = await addPaymentCard({ number: digits, cardholder, expiry })
      if (!res.ok) {
        setVerifying(false)
        setError(res.error)
        return
      }
      onAdded(res.cards)
    } catch {
      setVerifying(false)
      setError("Не удалось привязать карту. Попробуйте ещё раз.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form
        onSubmit={proceed}
        noValidate
        className="grain relative grid gap-8 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl sm:p-8 lg:grid-cols-[1.05fr_1fr] lg:items-center"
      >
        <div className="flex flex-col gap-5">
          <div className="mx-auto w-full max-w-sm">
            <CardPreview
              number={number}
              cardholder={cardholder}
              expiry={expiry}
              cvc={cvc}
              brand={brand}
              bank={bank}
              flipped={flipped}
            />
          </div>
          <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Заполнено</span>
              <span className="font-semibold text-foreground">{progress} из 4</span>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i < progress ? "bg-gold" : "bg-foreground/10")}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-display text-xl font-extrabold text-foreground">Новая карта</h3>
            <p className="text-sm text-muted-foreground">Visa, Mastercard, БЕЛКАРТ или МИР</p>
          </div>

          <Field label="Номер карты" htmlFor="card-number" ok={numberOk}>
            <div className="relative">
              <input
                id="card-number"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                value={formatCardNumber(number)}
                maxLength={23}
                onChange={(e) => setNumber(e.target.value)}
                onFocus={() => setFlipped(false)}
                className={cn(fieldClass, "pr-16 font-mono tracking-wider")}
              />
              {digits.length >= 2 && (
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-foreground">
                  <CardBrandMark brand={brand} className="h-5" />
                </span>
              )}
            </div>
            {bank && <span className="text-xs text-muted-foreground">Банк: <span className="text-foreground">{bank}</span></span>}
          </Field>

          <Field label="Держатель карты" htmlFor="card-holder" ok={holderOk}>
            <input
              id="card-holder"
              autoComplete="cc-name"
              placeholder="IVAN IVANOV"
              value={cardholder}
              maxLength={60}
              onChange={(e) => setCardholder(e.target.value.toUpperCase().replace(/[^A-Z .'-]/g, ""))}
              onFocus={() => setFlipped(false)}
              className={cn(fieldClass, "uppercase tracking-wide")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Срок" htmlFor="card-exp" ok={expiryOk}>
              <input
                id="card-exp"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="ММ/ГГ"
                value={expiry}
                maxLength={5}
                onFocus={() => setFlipped(false)}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 4)
                  setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                }}
                className={cn(fieldClass, "font-mono")}
              />
            </Field>
            <Field label="CVC" htmlFor="card-cvc" ok={cvcOk}>
              <input
                id="card-cvc"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                value={cvc}
                maxLength={4}
                onFocus={() => setFlipped(true)}
                onBlur={() => setFlipped(false)}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={cn(fieldClass, "font-mono tracking-[0.3em]")}
              />
            </Field>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-110 active:scale-[0.98]"
            >
              <ShieldMark className="size-5" />
              Привязать карту
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="h-12 rounded-full px-6 font-semibold text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground"
              >
                Отмена
              </button>
            )}
          </div>
        </div>
      </form>

      {verifying && (
        <SecureChallenge
          last4={digits.slice(-4)}
          brand={brand}
          bank={bank}
          busy={busy}
          onConfirm={confirm3DS}
          onCancel={() => !busy && setVerifying(false)}
        />
      )}
    </>
  )
}

function Field({ label, htmlFor, ok, children }: { label: string; htmlFor: string; ok: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="flex items-center justify-between text-sm font-medium text-foreground/85">
        {label}
        <CheckMark className={cn("size-4 text-gold transition", ok ? "scale-100 opacity-100" : "scale-50 opacity-0")} aria-hidden="true" />
      </label>
      {children}
    </div>
  )
}

/** Simulated 3-D Secure step; accepts any 4–6 digit code until a real gateway is wired in. */
function SecureChallenge({
  last4,
  brand,
  bank,
  busy,
  onConfirm,
  onCancel,
}: {
  last4: string
  brand: CardBrand
  bank: string | null
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const [code, setCode] = useState("")
  const [seconds, setSeconds] = useState(30)

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tds-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-md sm:items-center sm:p-4"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-8 sm:rounded-3xl">
        <div className={cn("flex items-center justify-between gap-3 bg-gradient-to-br px-5 py-4 text-foreground", BRAND_MATERIAL[brand])}>
          <span id="tds-title" className="flex items-center gap-2 text-sm font-semibold">
            <ShieldMark className="size-4" />
            3-D Secure
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Закрыть"
            className="grid size-8 place-items-center rounded-full transition hover:bg-foreground/20 disabled:opacity-50"
          >
            <PlusMark className="size-4 rotate-45" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (code.length >= 4 && !busy) onConfirm()
          }}
          className="flex flex-col gap-4 p-5"
        >
          <div className="flex items-center justify-between rounded-2xl bg-foreground/5 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{bank ?? CARD_BRAND_LABEL[brand]}</span>
            <span className="flex items-center gap-2 font-mono font-semibold text-foreground">
              <CardBrandMark brand={brand} className="h-4" />
              •••• {last4}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Банк отправил СМС с кодом подтверждения на номер, привязанный к карте.
          </p>
          <label htmlFor="tds-code" className="sr-only">
            Код из СМС
          </label>
          <input
            id="tds-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="••••"
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={cn(fieldClass, "h-14 text-center font-mono text-2xl tracking-[0.5em]")}
          />
          <button
            type="button"
            onClick={() => setSeconds(30)}
            disabled={seconds > 0}
            className="self-start text-xs font-medium text-gold transition hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {seconds > 0 ? `Отправить повторно через ${seconds} с` : "Отправить код повторно"}
          </button>
          <button
            type="submit"
            disabled={code.length < 4 || busy}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Привязываем…" : "Подтвердить"}
          </button>
        </form>
      </div>
    </div>
  )
}
