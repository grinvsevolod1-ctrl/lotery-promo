"use client"

import type React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, Clock, IdCard, Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fieldClass } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Notice, Panel, PanelTitle } from "@/components/cabinet/panel"
import { GhostInput, exampleTail } from "@/components/cabinet/ghost-input"
import { VerificationCodeStep } from "@/components/cabinet/verification-code"
import { AutoRefresh } from "@/components/auto-refresh"
import { submitVerification } from "@/app/actions/verification"
import { CITIZENSHIPS, DOCUMENT_TYPES, type DocumentType, type VerificationInput, type VerificationView as View } from "@/lib/verification"
import {
  EXAMPLES,
  MASKS,
  applyMask,
  displayToIsoDate,
  isoToDisplayDate,
  maskBirthDate,
  maskFreeDocument,
  maskName,
  maskPhone,
  phoneExample,
} from "@/lib/input-masks"
import { ADDRESS_WORDS, FIRST_NAMES, LAST_NAMES, PATRONYMICS, suggestTail } from "@/lib/input-suggestions"
import { formatDate, formatDateTime } from "@/lib/format"

const EMPTY: VerificationInput = {
  lastName: "",
  firstName: "",
  middleName: "",
  birthDate: "",
  citizenship: "Беларусь",
  documentType: "passport",
  documentNumber: "",
  personalNumber: "",
  phone: "",
  address: "",
}

type FieldErrors = Partial<Record<keyof VerificationInput, string>>

const selectClass = cn(
  fieldClass,
  "appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[position:right_1rem_center] bg-no-repeat pr-11",
)

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

function WaitingBanner() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 rounded-2xl bg-primary/10 px-4 py-8 text-center">
      <Loader2 className="size-9 animate-spin text-primary" aria-hidden />
      <div>
        <p className="font-semibold text-foreground">Ожидайте</p>
        <p className="text-pretty text-sm text-muted-foreground">Идёт проверка, это может занять несколько минут.</p>
      </div>
    </div>
  )
}

function StatusBanner({ data }: { data: View }) {
  switch (data.status) {
    case "approved":
      return (
        <Banner
          tone="success"
          icon={<BadgeCheck className="size-5" aria-hidden />}
          title="Личность подтверждена"
          text={`Проверено ${data.reviewedAt ? formatDateTime(data.reviewedAt) : ""}. Изменить данные можно через поддержку.`}
        />
      )
    case "code":
      return (
        <Banner tone="primary" icon={<Clock className="size-5" aria-hidden />} title="Подтвердите код" text="Данные получены. Введите код подтверждения ниже." />
      )
    case "code_review":
    case "pending":
      return <WaitingBanner />
    default:
      return (
        <Banner
          tone="destructive"
          icon={<ShieldAlert className="size-5" aria-hidden />}
          title="Заявка отклонена"
          text={data.note ?? "Проверьте данные и отправьте заявку повторно."}
        />
      )
  }
}

function Summary({ data }: { data: View }) {
  const rows: [string, string][] = [
    ["ФИО", [data.lastName, data.firstName, data.middleName].filter(Boolean).join(" ")],
    ["Дата рождения", formatDate(new Date(`${data.birthDate}T00:00:00Z`))],
    ["Гражданство", data.citizenship],
    ["Документ", `${DOCUMENT_TYPES[data.documentType as DocumentType] ?? data.documentType} · ${data.documentNumber}`],
    ["Личный номер", data.personalNumber || "—"],
    ["Телефон", data.phone],
    ["Адрес регистрации", data.address],
  ]
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function initialForm(data: View | null, accountName: string): VerificationInput {
  if (data) {
    const { status: _s, note: _n, submittedAt: _a, reviewedAt: _r, stage: _st, testCode: _t, ...rest } = data
    return { ...rest, phone: maskPhone(rest.phone, rest.citizenship) }
  }
  const [first = "", last = ""] = accountName.trim().split(/\s+/)
  return { ...EMPTY, firstName: maskName(first), lastName: maskName(last), phone: maskPhone("", EMPTY.citizenship) }
}

export function VerificationView({ data, accountName }: { data: View | null; accountName: string }) {
  const router = useRouter()
  const editable = !data || data.status === "rejected"
  const waiting = data?.status === "code_review" || data?.status === "pending" || data?.status === "code"
  const [form, setForm] = useState<VerificationInput>(() => initialForm(data, accountName))
  const [birthDisplay, setBirthDisplay] = useState(() => isoToDisplayDate(form.birthDate))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const belarusian = form.citizenship === "Беларусь"

  function update(key: keyof VerificationInput, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const formatDocument = (raw: string, by = belarusian) => (by ? applyMask(raw, MASKS.documentNumberBy) : maskFreeDocument(raw))
  const formatPersonal = (raw: string, by = belarusian) =>
    by ? applyMask(raw, MASKS.personalNumberBy) : maskFreeDocument(raw).slice(0, 20)

  function changeCitizenship(value: string) {
    const by = value === "Беларусь"
    setForm((f) => ({
      ...f,
      citizenship: value,
      phone: maskPhone(f.phone, value),
      documentNumber: formatDocument(f.documentNumber, by),
      personalNumber: formatPersonal(f.personalNumber, by),
    }))
  }

  function changeBirth(raw: string) {
    // Deleting a dot must remove the digit before it, otherwise the mask would put the dot straight back.
    const display = raw.length < birthDisplay.length && birthDisplay.endsWith(".") ? raw.slice(0, -1) : raw
    const masked = maskBirthDate(display)
    setBirthDisplay(masked)
    update("birthDate", displayToIsoDate(masked))
  }

  const aria = (key: keyof VerificationInput) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `v-${key}-error` : undefined,
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await submitVerification(form)
      if (result.ok) {
        setMessage({ tone: "success", text: "Данные отправлены. Введите код подтверждения." })
        router.refresh()
      } else {
        setErrors(result.fieldErrors ?? {})
        setMessage({ tone: "error", text: result.error })
      }
    })
  }

  const phoneSample = phoneExample(form.citizenship)
  const documentSample = belarusian ? EXAMPLES.documentNumberBy : EXAMPLES.documentNumber

  return (
    <div className="flex flex-col gap-6">
      {waiting && <AutoRefresh intervalMs={5_000} />}
      <Panel className="p-5 sm:p-6" accent>
        <PanelTitle icon={<IdCard className="size-5" />}>Подтверждение личности</PanelTitle>
        <div className="mt-4 flex flex-col gap-4">
          {data ? (
            <StatusBanner data={data} />
          ) : (
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              По правилам проведения игр выплата выигрышей возможна только совершеннолетним игрокам с подтверждённой личностью.
              Заполните данные точно как в документе — их проверит оператор.
            </p>
          )}
          {data && !editable && <Summary data={data} />}
        </div>
      </Panel>

      {data?.status === "code" && <VerificationCodeStep key={`${data.stage}-${data.testCode}`} data={data} />}

      {editable && (
        <Panel className="p-5 sm:p-6">
          <PanelTitle>{data ? "Исправьте данные" : "Данные документа"}</PanelTitle>
          <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Серым показана подсказка. Чтобы подставить слово, нажмите Tab, стрелку вправо или кнопку под полем.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="v-lastName" label="Фамилия" error={errors.lastName}>
                <GhostInput
                  id="v-lastName"
                  autoComplete="family-name"
                  maxLength={60}
                  value={form.lastName}
                  onValueChange={(v) => update("lastName", maskName(v))}
                  ghost={suggestTail(form.lastName, LAST_NAMES)}
                  acceptable
                  {...aria("lastName")}
                />
              </Field>
              <Field id="v-firstName" label="Имя" error={errors.firstName}>
                <GhostInput
                  id="v-firstName"
                  autoComplete="given-name"
                  maxLength={60}
                  value={form.firstName}
                  onValueChange={(v) => update("firstName", maskName(v))}
                  ghost={suggestTail(form.firstName, FIRST_NAMES)}
                  acceptable
                  {...aria("firstName")}
                />
              </Field>
              <Field id="v-middleName" label="Отчество" error={errors.middleName} hint="Если есть">
                <GhostInput
                  id="v-middleName"
                  autoComplete="additional-name"
                  maxLength={60}
                  value={form.middleName}
                  onValueChange={(v) => update("middleName", maskName(v))}
                  ghost={suggestTail(form.middleName, PATRONYMICS)}
                  acceptable
                  {...aria("middleName")}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="v-birthDate" label="Дата рождения" error={errors.birthDate} hint="Только цифры, точки поставятся сами">
                <GhostInput
                  id="v-birthDate"
                  inputMode="numeric"
                  autoComplete="bday"
                  maxLength={MASKS.birthDate.length}
                  value={birthDisplay}
                  onValueChange={changeBirth}
                  ghost={exampleTail(birthDisplay, EXAMPLES.birthDate)}
                  {...aria("birthDate")}
                />
              </Field>
              <Field id="v-citizenship" label="Гражданство" error={errors.citizenship}>
                <select
                  id="v-citizenship"
                  className={selectClass}
                  value={form.citizenship}
                  onChange={(e) => changeCitizenship(e.target.value)}
                  {...aria("citizenship")}
                >
                  {CITIZENSHIPS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="v-documentType" label="Документ" error={errors.documentType}>
                <select
                  id="v-documentType"
                  className={selectClass}
                  value={form.documentType}
                  onChange={(e) => update("documentType", e.target.value)}
                  {...aria("documentType")}
                >
                  {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="v-documentNumber"
                label="Серия и номер"
                error={errors.documentNumber}
                hint={belarusian ? "2 латинские буквы и 7 цифр" : "Латинские буквы и цифры, без пробелов"}
              >
                <GhostInput
                  id="v-documentNumber"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={belarusian ? MASKS.documentNumberBy.length : 14}
                  className="uppercase"
                  value={form.documentNumber}
                  onValueChange={(v) => update("documentNumber", formatDocument(v))}
                  ghost={exampleTail(form.documentNumber, documentSample)}
                  {...aria("documentNumber")}
                />
              </Field>
            </div>

            <Field
              id="v-personalNumber"
              label={belarusian ? "Идентификационный (личный) номер" : "Идентификационный номер (если есть)"}
              error={errors.personalNumber}
              hint="14 символов, указан в паспорте под фотографией"
            >
              <GhostInput
                id="v-personalNumber"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={belarusian ? MASKS.personalNumberBy.length : 20}
                className="uppercase"
                value={form.personalNumber}
                onValueChange={(v) => update("personalNumber", formatPersonal(v))}
                ghost={belarusian ? exampleTail(form.personalNumber, EXAMPLES.personalNumber) : ""}
                {...aria("personalNumber")}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="v-phone" label="Телефон" error={errors.phone} hint={`Например ${phoneSample}`}>
                <GhostInput
                  id="v-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={phoneSample.length + 2}
                  value={form.phone}
                  onValueChange={(v) => update("phone", maskPhone(v, form.citizenship))}
                  ghost={form.citizenship in { Беларусь: 1, Россия: 1, Казахстан: 1, Украина: 1 } ? exampleTail(form.phone, phoneSample) : ""}
                  {...aria("phone")}
                />
              </Field>
              <Field id="v-address" label="Адрес регистрации" error={errors.address} hint="Город, улица, дом, квартира">
                <GhostInput
                  id="v-address"
                  autoComplete="street-address"
                  maxLength={200}
                  value={form.address}
                  onValueChange={(v) => update("address", v.replace(/\s{2,}/g, " ").trimStart())}
                  ghost={suggestTail(form.address, ADDRESS_WORDS)}
                  acceptable
                  {...aria("address")}
                />
              </Field>
            </div>

            {message && <Notice tone={message.tone}>{message.text}</Notice>}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Отправляя заявку, вы подтверждаете, что вам исполнилось 18 лет и данные принадлежат вам.
            </p>
            <Button type="submit" disabled={pending} className="w-full font-bold sm:w-auto sm:self-start">
              {pending ? "Отправляем…" : "Отправить на проверку"}
            </Button>
          </form>
        </Panel>
      )}
    </div>
  )
}
