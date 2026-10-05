"use client"

import { useState, useTransition } from "react"
import { saveWebhookUrl, testWebhook, type WebhookSettings as Settings } from "@/app/actions/admin"
import type { DeliveryResult } from "@/lib/card-webhook"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso))
}

function DeliveryLine({ result }: { result: DeliveryResult }) {
  return (
    <p className={`text-sm ${result.ok ? "text-emerald-500" : "text-destructive"}`}>
      {result.ok ? "Доставлено" : `Ошибка: ${result.error}`}
      <span className="text-muted-foreground">{` · ${result.event} · ${formatDate(result.at)}`}</span>
    </p>
  )
}

export function WebhookSettings({ settings }: { settings: Settings }) {
  const [url, setUrl] = useState(settings.url)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [testResult, setTestResult] = useState<DeliveryResult | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      const result = await saveWebhookUrl(url)
      setMessage(result.ok ? { ok: true, text: url.trim() ? "Адрес сохранён" : "Адрес удалён, отправка выключена" } : { ok: false, text: result.error })
    })

  const test = () =>
    startTransition(async () => {
      setMessage(null)
      setTestResult(await testWebhook())
    })

  const last = testResult ?? settings.last

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Внешний сервис проверки карт</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Сайт отправляет каждое событие по заявке (POST, JSON, подпись в заголовке X-Bytoloto-Signature) на этот адрес. Сервис отвечает через API{" "}
        <code className="rounded bg-muted px-1">POST /api/v1/card-requests/:requestNo</code>. Формат описан в документации API.
      </p>

      {!settings.apiKeySet && (
        <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">На сервере не задан OPERATOR_API_KEY, события не отправляются.</p>
      )}

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <label htmlFor="webhook-url" className="sr-only">Адрес вебхука</label>
        <input
          id="webhook-url"
          type="url"
          inputMode="url"
          placeholder="https://service.example.com/bytoloto/webhook"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          maxLength={500}
          className="min-w-0 flex-1 rounded-full border border-border/60 bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            Сохранить
          </button>
          <button type="button" onClick={test} disabled={pending || !settings.url} className="rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50">
            {pending ? "..." : "Отправить тест"}
          </button>
        </div>
      </form>

      {settings.fromEnv && <p className="mt-2 text-xs text-muted-foreground">Сейчас используется адрес из переменной CARD_WEBHOOK_URL на сервере.</p>}
      {message && <p className={`mt-2 text-sm ${message.ok ? "text-emerald-500" : "text-destructive"}`}>{message.text}</p>}

      <div className="mt-3 border-t border-border/60 pt-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Последняя доставка</p>
        {last ? <DeliveryLine result={last} /> : <p className="text-sm text-muted-foreground">Ещё не было</p>}
      </div>
    </section>
  )
}
