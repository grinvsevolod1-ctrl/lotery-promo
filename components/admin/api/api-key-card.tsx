"use client"

import { useState, useTransition } from "react"
import { revealApiKey } from "@/app/actions/admin-api"

export function ApiKeyCard({ isSet }: { isSet: boolean }) {
  const [key, setKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  const loadKey = async () => key ?? (await revealApiKey())

  const toggle = () =>
    startTransition(async () => {
      if (key) return setKey(null)
      setKey(await revealApiKey())
    })

  const copy = () =>
    startTransition(async () => {
      const value = await loadKey()
      if (!value) return
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">API-ключ</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isSet ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"}`}>
          {isSet ? "Активен" : "Не задан"}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {"Передаётся в заголовке "}
        <code className="rounded bg-muted px-1">Authorization: Bearer ...</code>
        {" и подписывает вебхуки."}
      </p>
      {isSet ? (
        <>
          <code className="block overflow-x-auto whitespace-nowrap rounded-xl bg-background px-3 py-2 font-mono text-sm text-foreground">
            {key ?? "•".repeat(32)}
          </code>
          <div className="flex gap-2">
            <button type="button" onClick={toggle} disabled={pending} className="rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50">
              {key ? "Скрыть" : "Показать"}
            </button>
            <button type="button" onClick={copy} disabled={pending} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
        </>
      ) : (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">Добавьте OPERATOR_API_KEY в .env на сервере.</p>
      )}
    </section>
  )
}
