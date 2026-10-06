"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createTemplate, deleteTemplate, type SupportTemplateRow } from "@/app/actions/admin-support"
import { TEMPLATE_PLACEHOLDERS } from "@/lib/support-templates"

export function TemplateManager({ templates }: { templates: SupportTemplateRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createTemplate({ title, body })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setTitle("")
      setBody("")
      router.refresh()
    })
  }

  function remove(id: number) {
    startTransition(async () => {
      await deleteTemplate(id)
      router.refresh()
    })
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5" aria-labelledby="templates-heading">
      <div className="flex flex-col gap-1">
        <h2 id="templates-heading" className="font-display text-lg font-bold text-foreground">
          Шаблоны ответов
        </h2>
        <p className="text-sm text-muted-foreground">
          В тексте работают подстановки:{" "}
          {TEMPLATE_PLACEHOLDERS.map((item, index) => (
            <span key={item.token}>
              <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground">{item.token}</code> — {item.hint}
              {index < TEMPLATE_PLACEHOLDERS.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-border/60">
        {templates.map((template) => (
          <li key={template.id} className="flex items-start justify-between gap-3 py-3">
            <details className="min-w-0 flex-1">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">{template.title}</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{template.body}</p>
            </details>
            <button
              type="button"
              onClick={() => remove(template.id)}
              disabled={pending}
              className="shrink-0 rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl bg-background p-4">
        <p className="text-sm font-semibold text-foreground">Новый шаблон</p>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={60}
          placeholder="Название, например «Возврат средств»"
          aria-label="Название шаблона"
          className="h-11 rounded-full border border-border/60 bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Текст ответа"
          aria-label="Текст шаблона"
          className="resize-y rounded-2xl border border-border/60 bg-card p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground"
        />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={pending || title.trim().length < 2 || body.trim().length < 5}
          className="h-11 self-start rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          Добавить шаблон
        </button>
      </form>
    </section>
  )
}
