"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { submitSupportRequest } from "@/app/actions/support"
import { SUPPORT_TOPICS, type SupportTopic } from "@/lib/support-topics"
import { fieldClass } from "@/components/ui/input"
import { actionErrorMessage } from "@/lib/action-error"
import { Check as CheckMark } from "lucide-react"
import { cn } from "@/lib/utils"

export function SupportForm() {
  const router = useRouter()
  const [topic, setTopic] = useState<SupportTopic>("account")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentId, setSentId] = useState<number | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await submitSupportRequest({ topic, message })
      if (!res.ok) setError(res.error)
      else {
        setSentId(res.id)
        setMessage("")
        router.refresh()
      }
    } catch (err) {
      setError(actionErrorMessage(err, "Не удалось отправить обращение. Попробуйте ещё раз."))
    } finally {
      setSubmitting(false)
    }
  }

  if (sentId) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center ring-1 ring-border animate-in fade-in zoom-in-95 duration-300">
        <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <CheckMark className="size-7" />
        </span>
        <h2 className="font-display text-xl font-extrabold text-foreground">Обращение №{sentId} принято</h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
          Мы уже получили ваш вопрос. Подтверждение с номером отправлено на почту — ответ придёт туда же.
        </p>
        <button type="button" onClick={() => setSentId(null)} className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Написать ещё
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-3xl bg-card p-5 ring-1 ring-border sm:p-6">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-sm font-medium text-muted-foreground">Тема</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SUPPORT_TOPICS) as SupportTopic[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTopic(key)}
              aria-pressed={topic === key}
              className={cn(
                "rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95",
                topic === key ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "bg-foreground/5 text-foreground/75 hover:bg-foreground/10",
              )}
            >
              {SUPPORT_TOPICS[key]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
        Сообщение
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          placeholder="Расскажите, что случилось."
          className={cn(fieldClass, "min-h-40 resize-none py-4 leading-relaxed")}
        />
        <span className="self-end text-[11px] tabular-nums">{message.length}/2000</span>
      </label>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={submitting || message.trim().length < 10}
        className="min-h-14 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
      >
        {submitting ? "Отправляем…" : "Отправить обращение"}
      </button>
    </form>
  )
}
