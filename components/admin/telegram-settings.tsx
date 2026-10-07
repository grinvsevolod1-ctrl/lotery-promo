"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  connectTelegramWebhook,
  saveTelegramSettings,
  sendTelegramTest,
  type TelegramSettings,
  type TelegramTestResult,
} from "@/app/actions/admin-telegram"

const SLOTS = 3
const inputClass =
  "w-full min-w-0 rounded-full border border-border/60 bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary"

function SourceNote({ source }: { source: "admin" | "env" | null }) {
  if (source !== "env") return null
  return <p className="text-xs text-muted-foreground">Сейчас берётся из файла .env на сервере. После сохранения здесь будет использоваться значение из админки.</p>
}

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"}`}>
      <span className={`size-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-destructive"}`} aria-hidden="true" />
      {children}
    </span>
  )
}

export function TelegramSettingsForm({ settings }: { settings: TelegramSettings }) {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [ids, setIds] = useState<string[]>(() => Array.from({ length: SLOTS }, (_, i) => settings.adminIds[i] ?? ""))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [tests, setTests] = useState<TelegramTestResult[] | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      setTests(null)
      const result = await saveTelegramSettings({ token, adminIds: ids })
      setMessage(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error })
      if (result.ok) setToken("")
      router.refresh()
    })

  const connect = () =>
    startTransition(async () => {
      const result = await connectTelegramWebhook()
      setMessage(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error })
      router.refresh()
    })

  const test = () =>
    startTransition(async () => {
      setMessage(null)
      const result = await sendTelegramTest()
      if ("error" in result) {
        setTests(null)
        setMessage({ ok: false, text: result.error })
      } else setTests(result)
    })

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <form
        className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <section className="flex flex-col gap-2" aria-labelledby="tg-token-heading">
          <h2 id="tg-token-heading" className="font-display text-lg font-bold text-foreground">Токен бота</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Токен выдаёт @BotFather. Оставьте поле пустым, чтобы не менять текущий.
          </p>
          <label htmlFor="tg-token" className="sr-only">Новый токен бота</label>
          <input
            id="tg-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={settings.tokenMasked || "123456789:AAH..."}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            maxLength={100}
            className={`${inputClass} font-mono`}
          />
          <SourceNote source={settings.tokenSource} />
        </section>

        <section className="flex flex-col gap-2" aria-labelledby="tg-admins-heading">
          <h2 id="tg-admins-heading" className="font-display text-lg font-bold text-foreground">Администраторы</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            До трёх Telegram user ID. Каждый получает все заявки и может нажимать кнопки «Подтвердить» и «Отклонить». Пустые поля игнорируются.
          </p>
          <div className="flex flex-col gap-2">
            {ids.map((value, index) => (
              <div key={index} className="flex items-center gap-3">
                <label htmlFor={`tg-admin-${index}`} className="w-24 shrink-0 text-sm text-muted-foreground">
                  {`Админ ${index + 1}`}
                </label>
                <input
                  id={`tg-admin-${index}`}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="123456789"
                  value={value}
                  onChange={(event) => {
                    const next = event.target.value.replace(/\D/g, "").slice(0, 15)
                    setIds((current) => current.map((item, i) => (i === index ? next : item)))
                  }}
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            ))}
          </div>
          <SourceNote source={settings.adminIdsSource} />
        </section>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <button type="submit" disabled={pending} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {pending ? "Сохраняем..." : "Сохранить"}
          </button>
          <button type="button" onClick={test} disabled={pending || !settings.tokenMasked} className="rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50">
            Отправить тест
          </button>
        </div>

        <div aria-live="polite" className="flex flex-col gap-1.5">
          {message && <p className={`text-sm ${message.ok ? "text-emerald-500" : "text-destructive"}`}>{message.text}</p>}
          {tests?.map((result) => (
            <p key={result.id} className={`text-sm ${result.ok ? "text-emerald-500" : "text-destructive"}`}>
              <span className="font-mono">{result.id}</span>
              {result.ok ? " — сообщение доставлено" : ` — ${result.error}`}
            </p>
          ))}
        </div>
      </form>

      <aside className="flex flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-5" aria-labelledby="tg-status-heading">
          <h2 id="tg-status-heading" className="font-display text-lg font-bold text-foreground">Состояние</h2>
          <div className="flex flex-wrap gap-2">
            <StatusPill ok={Boolean(settings.botUsername)}>{settings.botUsername ? `@${settings.botUsername}` : "Бот не подключён"}</StatusPill>
            <StatusPill ok={settings.webhookActive}>{settings.webhookActive ? "Кнопки работают" : "Вебхук не подключён"}</StatusPill>
            <StatusPill ok={settings.adminIds.length > 0}>{`Админов: ${settings.adminIds.length}`}</StatusPill>
          </div>
          {settings.webhookError && <p className="text-sm text-destructive">{settings.webhookError}</p>}
          <p className="break-all text-xs text-muted-foreground">{`Адрес вебхука: ${settings.webhookUrl}`}</p>
          <button
            type="button"
            onClick={connect}
            disabled={pending || !settings.tokenMasked}
            className="self-start rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50"
          >
            {settings.webhookActive ? "Переподключить вебхук" : "Подключить вебхук"}
          </button>
        </section>

        <section className="flex flex-col gap-2 rounded-3xl border border-border/60 bg-card p-5" aria-labelledby="tg-help-heading">
          <h2 id="tg-help-heading" className="font-display text-lg font-bold text-foreground">Как узнать user ID</h2>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Откройте в Telegram бота @userinfobot и нажмите «Start» — он пришлёт ваш ID (только цифры).</li>
            <li>Вставьте ID в поле «Админ» и сохраните.</li>
            <li>
              {settings.botUsername ? `Откройте @${settings.botUsername}` : "Откройте своего бота"} и нажмите «Start» — без этого Telegram не разрешит боту писать вам.
            </li>
            <li>Нажмите «Отправить тест» и проверьте, что сообщение пришло каждому.</li>
          </ol>
        </section>
      </aside>
    </div>
  )
}
