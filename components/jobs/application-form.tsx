"use client"

import type React from "react"
import { useRef, useState, useTransition } from "react"
import { FileText, Paperclip, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/ui/input"
import { Notice, Panel, PanelTitle } from "@/components/cabinet/panel"
import { GhostInput, exampleTail } from "@/components/cabinet/ghost-input"
import { submitJobApplication, type ApplyFieldErrors } from "@/app/actions/jobs"
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_BYTES, MAX_FILES, formatFileSize } from "@/lib/jobs"
import { EXAMPLES, MASKS, applyMask, maskFreeDocument, maskName, maskPhone, phoneExample } from "@/lib/input-masks"
import { cn } from "@/lib/utils"

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

const PHONE_SAMPLE = phoneExample("Беларусь")

export function ApplicationForm({ slug, vacancyTitle }: { slug: string; vacancyTitle: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState(() => maskPhone("", "Беларусь"))
  const [personalNumber, setPersonalNumber] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<ApplyFieldErrors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const clearError = (key: keyof ApplyFieldErrors) => errors[key] && setErrors((prev) => ({ ...prev, [key]: undefined }))

  function addFiles(list: FileList | null) {
    if (!list) return
    const incoming = Array.from(list)
    const next = [...files]
    let error: string | undefined
    for (const file of incoming) {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) error = `«${file.name}»: допустимы PDF, DOC, DOCX, JPG и PNG`
      else if (file.size > MAX_FILE_BYTES) error = `«${file.name}» больше 4 МБ`
      else if (next.length >= MAX_FILES) error = `Не больше ${MAX_FILES} файлов`
      else if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file)
    }
    setFiles(next)
    setErrors((prev) => ({ ...prev, files: error }))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const aria = (key: keyof ApplyFieldErrors) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `j-${key}-error` : undefined,
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    const formData = new FormData(e.currentTarget)
    formData.delete("files")
    for (const file of files) formData.append("files", file)
    startTransition(async () => {
      const result = await submitJobApplication(formData)
      // A successful submit redirects to the status page; only a failure returns here.
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {})
        setMessage(result.error)
      }
    })
  }

  return (
    <Panel className="p-5 sm:p-7" accent>
      <PanelTitle icon={<Send className="size-5" />}>Откликнуться на вакансию</PanelTitle>
      <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
        Анкета на позицию «{vacancyTitle}». После отправки нужно подтвердить личность через МСИ: идентификационный номер и телефон, как в
        личном кабинете игрока. Затем на почту придёт письмо о приёме анкеты.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4" encType="multipart/form-data">
        <input type="hidden" name="slug" value={slug} />

        <Field id="j-fullName" label="Фамилия и имя" error={errors.fullName} hint="Как в документе">
          <GhostInput
            id="j-fullName"
            name="fullName"
            autoComplete="name"
            maxLength={100}
            value={fullName}
            onValueChange={(v) => {
              setFullName(maskName(v).slice(0, 100))
              clearError("fullName")
            }}
            ghost=""
            {...aria("fullName")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="j-email" label="E-mail" error={errors.email} hint="Сюда придёт уведомление о статусе">
            <input
              id="j-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={120}
              className={fieldClass}
              onChange={() => clearError("email")}
              {...aria("email")}
            />
          </Field>
          <Field id="j-phone" label="Телефон" error={errors.phone} hint={`Например ${PHONE_SAMPLE}`}>
            <GhostInput
              id="j-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={PHONE_SAMPLE.length + 4}
              value={phone}
              onValueChange={(v) => {
                // Belarusian numbers get the local mask; a different country code is kept as typed.
                const digits = v.replace(/\D/g, "")
                setPhone(digits === "" || digits.startsWith("375") || digits.startsWith("80") ? maskPhone(v, "Беларусь") : `+${digits.slice(0, 15)}`)
                clearError("phone")
              }}
              ghost={phone.startsWith("+375") ? exampleTail(phone, PHONE_SAMPLE) : ""}
              {...aria("phone")}
            />
          </Field>
        </div>

        <Field
          id="j-personalNumber"
          label="Идентификационный (личный) номер"
          error={errors.personalNumber}
          hint="14 символов, указан в паспорте под фотографией. Нужен для проверки через МСИ"
        >
          <GhostInput
            id="j-personalNumber"
            name="personalNumber"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            className="uppercase"
            value={personalNumber}
            onValueChange={(v) => {
              // A Belarusian number starts with 7 digits and follows a fixed mask; any other identifier is free-form.
              const belarusian = v === "" || /^\d/.test(v)
              setPersonalNumber(belarusian ? applyMask(v, MASKS.personalNumberBy) : maskFreeDocument(v).slice(0, 20))
              clearError("personalNumber")
            }}
            ghost={exampleTail(personalNumber, EXAMPLES.personalNumber)}
            {...aria("personalNumber")}
          />
        </Field>

        <Field id="j-about" label="Коротко о себе" error={errors.about} hint="Опыт, почему интересна вакансия, удобное время для связи">
          <textarea
            id="j-about"
            name="about"
            rows={5}
            maxLength={2000}
            className={cn(fieldClass, "h-auto resize-y py-3 leading-relaxed")}
            onChange={() => clearError("about")}
            {...aria("about")}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <Label htmlFor="j-files">Файлы</Label>
          <input
            ref={fileInputRef}
            id="j-files"
            type="file"
            multiple
            accept={ALLOWED_FILE_EXTENSIONS.join(",")}
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
            aria-describedby="j-files-hint"
          />
          <div className="flex flex-col gap-2">
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-2.5">
                <FileText className="size-4 shrink-0 text-gold" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{file.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((f) => f !== file))}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Убрать файл ${file.name}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            ))}
            {files.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-card"
              >
                <Paperclip className="size-4" aria-hidden />
                {files.length === 0 ? "Прикрепить резюме или портфолио" : "Добавить ещё файл"}
              </button>
            )}
          </div>
          <p id="j-files-hint" className={cn("text-xs", errors.files ? "text-destructive" : "text-muted-foreground")}>
            {errors.files ?? `До ${MAX_FILES} файлов по 4 МБ: PDF, DOC, DOCX, JPG, PNG. Необязательно.`}
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            name="consent"
            className="mt-1 size-4 shrink-0 accent-primary"
            onChange={() => clearError("consent")}
            aria-invalid={errors.consent ? true : undefined}
          />
          <span>
            Даю согласие на обработку персональных данных для рассмотрения анкеты и подтверждаю, что указанные данные принадлежат мне.
            {errors.consent && <span className="block text-xs text-destructive">{errors.consent}</span>}
          </span>
        </label>

        {message && <Notice tone="error">{message}</Notice>}

        <Button type="submit" disabled={pending} className="h-13 w-full rounded-2xl text-base font-bold sm:w-auto sm:self-start sm:px-8">
          {pending ? "Отправляем…" : "Отправить анкету"}
        </Button>
      </form>
    </Panel>
  )
}
