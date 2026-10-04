"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { confirmCardVerification, type CardVerificationPreview } from "@/app/actions/cards"
import { CARD_BRAND_LABEL, formatExpiry, maskCard } from "@/lib/payment-cards"
import { CardBrandMark } from "@/components/cabinet/card-brand-mark"
import { CheckMark, KeyMark, ShieldMark, WarnMark } from "@/components/icons"
import { cn } from "@/lib/utils"

const RESEND_SECONDS = 30

export function GatewayConfirm({
  token,
  preview,
  cardsHref = "/cabinet/cards",
}: {
  token: string
  preview: CardVerificationPreview
  cardsHref?: string
}) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 4 || busy) return
    setBusy(true)
    setError("")
    try {
      const res = await confirmCardVerification(token, code)
      if (!res.ok) {
        setError(res.error)
        setBusy(false)
        return
      }
      setDone(true)
      setTimeout(() => router.push(cardsHref), 900)
    } catch {
      setError("Не удалось подтвердить привязку. Попробуйте ещё раз.")
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[oklch(0.14_0.02_280)] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-foreground/10 bg-card shadow-2xl shadow-black/40">
        {/* Шлюз: слева наш бренд, справа — автоматически определённый банк */}
        <div className="flex items-center justify-between gap-3 border-b border-foreground/10 bg-gradient-to-r from-primary/15 via-transparent to-transparent px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldMark className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-foreground">ToLoto Pay</p>
              <p className="text-[11px] text-muted-foreground">Платёжный шлюз</p>
            </div>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[11px] text-muted-foreground">Банк-эмитент</span>
            <span className="text-sm font-semibold text-foreground">{preview.bankName ?? CARD_BRAND_LABEL[preview.brand]}</span>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
                <CheckMark className="size-7" />
              </span>
              <p className="text-lg font-bold text-foreground">Карта привязана</p>
              <p className="text-sm text-muted-foreground">Переходим в кабинет…</p>
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-display text-xl font-extrabold text-foreground">Подтверждение привязки карты</h1>
                <p className="mt-1 text-sm text-muted-foreground">Операция без списания средств — только проверка карты</p>
              </div>

              <dl className="grid gap-2.5 rounded-2xl bg-foreground/5 px-4 py-3 text-sm">
                <Row label="Карта">
                  <span className="flex items-center gap-2 font-mono font-semibold text-foreground">
                    <CardBrandMark brand={preview.brand} className="h-4" />
                    {maskCard(preview.last4)}
                  </span>
                </Row>
                <Row label="Держатель">
                  <span className="font-semibold text-foreground">{preview.cardholder}</span>
                </Row>
                <Row label="Срок действия">
                  <span className="font-mono text-foreground">{formatExpiry(preview.expMonth, preview.expYear)}</span>
                </Row>
              </dl>

              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                Банк отправил СМС с одноразовым кодом подтверждения на номер, привязанный к карте. Введите код, чтобы
                завершить привязку.
              </p>

              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <label htmlFor="gw-code" className="sr-only">
                  Код из СМС
                </label>
                <input
                  id="gw-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="••••"
                  value={code}
                  maxLength={6}
                  disabled={busy}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 w-full rounded-2xl border border-border bg-background/60 text-center font-mono text-2xl tracking-[0.5em] text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setSeconds(RESEND_SECONDS)}
                  disabled={seconds > 0 || busy}
                  className="self-start text-xs font-medium text-gold transition hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {seconds > 0 ? `Отправить код повторно через ${seconds} с` : "Отправить код повторно"}
                </button>

                {error && (
                  <p role="alert" className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <WarnMark className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={code.length < 4 || busy}
                    className={cn(
                      "flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/40 transition hover:brightness-110 active:scale-[0.98]",
                      busy && "opacity-70",
                    )}
                  >
                    {busy ? "Подтверждаем…" : "Подтвердить"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => router.push(cardsHref)}
                    className="h-12 rounded-full px-6 font-semibold text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground disabled:opacity-50"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground text-pretty">
            <KeyMark className="mt-0.5 size-4 shrink-0 text-gold" />
            Операция защищена 3-D Secure. ToLoto Pay не хранит полный номер карты — только последние 4 цифры после
            подтверждения.
          </p>
        </div>
      </div>
    </main>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
