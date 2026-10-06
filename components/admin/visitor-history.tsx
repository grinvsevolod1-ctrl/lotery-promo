"use client"

import { useId, useState, useTransition } from "react"
import { getVisitorEvents, type VisitorEventRow } from "@/app/actions/admin-users"
import { formatDateTime } from "@/lib/format"

const TYPE_LABEL: Record<string, string> = {
  first_visit: "Заход",
  ip_change: "Смена IP",
  sign_up: "Регистрация",
  sign_in: "Вход",
  card_bind: "Карта",
  card_step: "Карта",
  card_delete: "Карта",
  deposit: "Пополнение",
  withdrawal: "Вывод",
  game: "Игра",
  bonus: "Бонус",
  support: "Поддержка",
}

export function VisitorHistory({ visitorId }: { visitorId: number }) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<VisitorEventRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [pending, startTransition] = useTransition()

  function load() {
    setFailed(false)
    startTransition(async () => {
      try {
        setEvents(await getVisitorEvents(visitorId))
      } catch {
        setFailed(true)
      }
    })
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-fit rounded-full border border-border/60 px-3.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/5"
      >
        {open ? "Скрыть историю" : "История действий"}
      </button>

      {open && (
        <div id={panelId} className="rounded-2xl border border-border/60 bg-background p-3">
          {pending && !events ? (
            <p className="text-xs text-muted-foreground" role="status">
              Загружаю историю…
            </p>
          ) : failed ? (
            <p className="text-xs text-destructive" role="alert">
              Не удалось загрузить историю.{" "}
              <button type="button" onClick={load} className="underline">
                Повторить
              </button>
            </p>
          ) : events && events.length === 0 ? (
            <p className="text-xs text-muted-foreground">Действий пока нет.</p>
          ) : (
            <ol className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {events?.map((event) => (
                <li key={event.id} className="flex flex-col gap-0.5 border-l-2 border-primary/40 pl-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {TYPE_LABEL[event.type] ?? event.type}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground">{event.label}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
