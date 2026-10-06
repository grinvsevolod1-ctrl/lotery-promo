"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { replyToTicket, setTicketStatus, type AdminTicket, type SupportTemplateRow } from "@/app/actions/admin-support"
import { fillTemplate } from "@/lib/support-templates"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export function TicketCard({ ticket, templates }: { ticket: AdminTicket; templates: SupportTemplateRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [body, setBody] = useState("")
  const [close, setClose] = useState(true)
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const isOpen = ticket.status === "open"

  function applyTemplate(template: SupportTemplateRow) {
    setBody(fillTemplate(template.body, { name: ticket.userName, id: ticket.id }))
    setNotice(null)
  }

  function send() {
    setNotice(null)
    startTransition(async () => {
      try {
        const result = await replyToTicket({ id: ticket.id, body, close })
        if (!result.ok) {
          setNotice({ tone: "error", text: result.error })
          return
        }
        setBody("")
        setNotice({
          tone: "ok",
          text: result.emailed ? "Ответ отправлен на почту и в кабинет игрока." : "Ответ сохранён в кабинете, но письмо не ушло — проверьте почту в блоке выше.",
        })
        router.refresh()
      } catch {
        setNotice({ tone: "error", text: "Не удалось отправить ответ. Попробуйте ещё раз." })
      }
    })
  }

  function toggleStatus() {
    startTransition(async () => {
      await setTicketStatus(ticket.id, isOpen ? "closed" : "open")
      router.refresh()
    })
  }

  return (
    <li className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-base font-bold text-foreground">
            №{ticket.id} · {ticket.topicLabel}
          </p>
          <p className="break-all text-sm text-muted-foreground">
            {ticket.userName} · <a href={`mailto:${ticket.userEmail}`} className="text-primary hover:underline">{ticket.userEmail}</a>
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">{formatDateTime(ticket.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              isOpen ? "bg-primary/12 text-primary" : "bg-foreground/10 text-muted-foreground",
            )}
          >
            {isOpen ? "Открыто" : "Закрыто"}
          </span>
          <button
            type="button"
            onClick={toggleStatus}
            disabled={pending}
            className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-foreground hover:bg-foreground/5 disabled:opacity-50"
          >
            {isOpen ? "Закрыть" : "Открыть снова"}
          </button>
        </div>
      </div>

      <p className="whitespace-pre-wrap rounded-2xl bg-background p-4 text-sm leading-relaxed text-foreground">{ticket.message}</p>

      {ticket.replies.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Ответы поддержки">
          {ticket.replies.map((reply) => (
            <li key={reply.id} className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{reply.body}</p>
              <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                Вы · {formatDateTime(reply.createdAt)} · {reply.emailed ? "письмо отправлено" : "письмо не отправлено"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Шаблон ответа</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-full border border-border/60 px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {template.title}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-muted-foreground">
          Ответ игроку
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="Выберите шаблон или напишите ответ. Приветствие «Здравствуйте, имя!» добавится в письмо автоматически."
            className="min-h-32 w-full resize-y rounded-2xl border border-border/60 bg-background p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={close} onChange={(event) => setClose(event.target.checked)} className="size-4 accent-primary" />
            Закрыть обращение после ответа
          </label>
          <button
            type="button"
            onClick={send}
            disabled={pending || body.trim().length < 2}
            className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Отправляем…" : "Отправить ответ"}
          </button>
        </div>

        {notice && (
          <p role={notice.tone === "error" ? "alert" : "status"} className={cn("text-sm", notice.tone === "error" ? "text-destructive" : "text-primary")}>
            {notice.text}
          </p>
        )}
      </div>
    </li>
  )
}
