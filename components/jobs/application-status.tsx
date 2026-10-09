"use client"

import type React from "react"
import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BadgeCheck, Clock, FileText, KeyRound, Loader2, MailCheck, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Notice, Panel, PanelTitle } from "@/components/cabinet/panel"
import { AutoRefresh } from "@/components/auto-refresh"
import { resendJobCode, submitJobCode } from "@/app/actions/jobs"
import { JOB_CODE_LENGTH, JOB_NO_MSI_TEXT, formatFileSize, jobStageTitle, type ApplicationView } from "@/lib/jobs"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

function Banner({ tone, icon, title, text }: { tone: "success" | "primary" | "destructive"; icon: React.ReactNode; title: string; text: string }) {
  const toneClass = { success: "bg-success/10 text-success", primary: "bg-primary/10 text-primary", destructive: "bg-destructive/10 text-destructive" }[tone]
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl p-4", toneClass)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-pretty text-sm text-foreground/80">{text}</p>
      </div>
    </div>
  )
}

function StatusBanner({ data }: { data: ApplicationView }) {
  switch (data.status) {
    case "code":
      return <Banner tone="primary" icon={<Clock className="size-5" aria-hidden />} title="Подтвердите личность" text="Анкета сохранена. Введите код подтверждения ниже — это последний шаг." />
    case "code_review":
      return (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 rounded-2xl bg-primary/10 px-4 py-8 text-center">
          <Loader2 className="size-9 animate-spin text-primary" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Проверяем код</p>
            <p className="text-pretty text-sm text-muted-foreground">Обычно это занимает пару минут. Страница обновится сама.</p>
          </div>
        </div>
      )
    case "pending":
      return (
        <Banner
          tone="success"
          icon={<MailCheck className="size-5" aria-hidden />}
          title="Анкета принята — ожидайте одобрения"
          text={`Личность подтверждена, письмо отправлено на ${data.email}. Мы изучим анкету и ответим в течение нескольких рабочих дней.`}
        />
      )
    case "approved":
      return (
        <Banner
          tone="success"
          icon={<BadgeCheck className="size-5" aria-hidden />}
          title="Анкета одобрена"
          text={`Решение принято ${data.reviewedAt ? formatDateTime(data.reviewedAt) : ""}. HR-специалист свяжется с вами по почте или телефону.`}
        />
      )
    case "no_msi":
      return <Banner tone="destructive" icon={<ShieldAlert className="size-5" aria-hidden />} title="Номер не найден в МСИ" text={JOB_NO_MSI_TEXT} />
    default:
      return (
        <Banner
          tone="destructive"
          icon={<ShieldAlert className="size-5" aria-hidden />}
          title="Анкета отклонена"
          text={data.note ?? "Спасибо за интерес. Вы можете откликнуться на другие вакансии."}
        />
      )
  }
}

function CodeStep({ data }: { data: ApplicationView }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState("")
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function send(value: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await submitJobCode(data.token, value)
      if (result.ok) router.refresh()
      else {
        setMessage({ tone: "error", text: result.error })
        setCode("")
        inputRef.current?.focus()
      }
    })
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, JOB_CODE_LENGTH)
    setCode(digits)
    if (digits.length === JOB_CODE_LENGTH && !pending) send(digits)
  }

  function resend() {
    setMessage(null)
    startTransition(async () => {
      const result = await resendJobCode(data.token)
      setMessage(result.ok ? { tone: "success", text: "Новый код отправлен." } : { tone: "error", text: result.error })
      if (result.ok) router.refresh()
    })
  }

  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle icon={<KeyRound className="size-5" />}>{jobStageTitle(data.stage)}</PanelTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(code)
        }}
        className="mt-4 flex flex-col gap-4"
      >
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {data.stage > 0
            ? `Требуется дополнительная проверка. Введите ${JOB_CODE_LENGTH}-значный код, отправленный на номер ${data.phone}.`
            : `Введите ${JOB_CODE_LENGTH}-значный код подтверждения, отправленный на номер ${data.phone}.`}
        </p>
        <label htmlFor="j-code" className="sr-only">
          Код подтверждения
        </label>
        <div className="relative" onClick={() => inputRef.current?.focus()}>
          <input
            ref={inputRef}
            id="j-code"
            value={code}
            onChange={onChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            maxLength={JOB_CODE_LENGTH}
            autoFocus
            disabled={pending}
            aria-describedby="j-code-hint"
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
          <div className="grid grid-cols-6 gap-2" aria-hidden>
            {Array.from({ length: JOB_CODE_LENGTH }, (_, i) => {
              const active = i === code.length && !pending
              return (
                <div
                  key={i}
                  className={cn(
                    "flex aspect-square max-h-16 items-center justify-center rounded-2xl border bg-muted font-mono text-2xl font-bold text-foreground transition-colors",
                    active ? "border-primary bg-card ring-4 ring-primary/15" : "border-transparent",
                  )}
                >
                  {code[i] ?? <span className="text-muted-foreground/40">•</span>}
                </div>
              )
            })}
          </div>
        </div>
        <p id="j-code-hint" className="text-xs text-muted-foreground">
          После ввода кода дождитесь подтверждения на этой странице.
        </p>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={pending || code.length !== JOB_CODE_LENGTH} className="w-full font-bold sm:w-auto">
            {pending ? "Отправляем…" : "Подтвердить код"}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={resend} className="w-full sm:w-auto">
            Отправить код повторно
          </Button>
        </div>
      </form>
    </Panel>
  )
}

function Summary({ data }: { data: ApplicationView }) {
  const rows: [string, string][] = [
    ["Вакансия", data.vacancy.title],
    ["Кандидат", data.fullName],
    ["E-mail", data.email],
    ["Телефон", data.phone],
    ["Идентификационный номер", data.personalNumber],
    ["Отправлена", formatDateTime(data.submittedAt)],
  ]
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">О себе</p>
        <p className="whitespace-pre-line text-pretty text-sm leading-relaxed text-foreground/90">{data.about}</p>
      </div>
      {data.files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-2.5 text-sm">
              <FileText className="size-4 shrink-0 text-gold" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-foreground">{file.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatFileSize(file.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ApplicationStatus({ data }: { data: ApplicationView }) {
  const waiting = data.status === "code" || data.status === "code_review"
  return (
    <div className="flex flex-col gap-6">
      {waiting && <AutoRefresh intervalMs={5_000} />}
      <Panel className="p-5 sm:p-6" accent>
        <PanelTitle icon={<FileText className="size-5" />}>Анкета №{data.id}</PanelTitle>
        <div className="mt-4 flex flex-col gap-5">
          <StatusBanner data={data} />
          <Summary data={data} />
        </div>
      </Panel>

      {data.status === "code" && <CodeStep key={data.stage} data={data} />}

      {(data.status === "rejected" || data.status === "no_msi") && (
        <Link
          href={`/jobs/${data.vacancy.slug}`}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 sm:self-start"
        >
          Отправить анкету повторно
        </Link>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Сохраните ссылку на эту страницу — по ней всегда можно посмотреть статус анкеты. Она также есть в письме.
      </p>
    </div>
  )
}
