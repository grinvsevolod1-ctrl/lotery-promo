"use client"

import type React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, Clock, IdCard, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Notice, Panel, PanelTitle } from "@/components/cabinet/panel"
import { submitVerification } from "@/app/actions/verification"
import { CITIZENSHIPS, DOCUMENT_TYPES, type DocumentType, type VerificationInput, type VerificationView as View } from "@/lib/verification"
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
  phone: "+375",
  address: "",
}

type FieldErrors = Partial<Record<keyof VerificationInput, string>>

const selectClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
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

function StatusBanner({ data }: { data: View }) {
  if (data.status === "approved") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-success/10 p-4 text-success">
        <BadgeCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Личность подтверждена</p>
          <p className="text-sm text-foreground/80">
            Проверено {data.reviewedAt ? formatDateTime(data.reviewedAt) : ""}. Изменить данные можно через поддержку.
          </p>
        </div>
      </div>
    )
  }
  if (data.status === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-primary/10 p-4 text-primary">
        <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Заявка на проверке</p>
          <p className="text-sm text-foreground/80">
            Отправлена {formatDateTime(data.submittedAt)}. Обычно проверка занимает до 24 часов — мы пришлём уведомление.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-destructive">
      <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">Заявка отклонена</p>
        <p className="text-sm text-foreground/80">{data.note ?? "Проверьте данные и отправьте заявку повторно."}</p>
      </div>
    </div>
  )
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
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function VerificationView({ data, accountName }: { data: View | null; accountName: string }) {
  const router = useRouter()
  const editable = !data || data.status === "rejected"
  const [form, setForm] = useState<VerificationInput>(() => {
    if (data) {
      const { status: _s, note: _n, submittedAt: _a, reviewedAt: _r, ...rest } = data
      return rest
    }
    const [first = "", last = ""] = accountName.trim().split(/\s+/)
    return { ...EMPTY, firstName: first, lastName: last }
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const set = (key: keyof VerificationInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
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
        setMessage({ tone: "success", text: "Заявка отправлена на проверку." })
        router.refresh()
      } else {
        setErrors(result.fieldErrors ?? {})
        setMessage({ tone: "error", text: result.error })
      }
    })
  }

  const belarusian = form.citizenship === "Беларусь"
  const maxBirth = new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
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

      {editable && (
        <Panel className="p-5 sm:p-6">
          <PanelTitle>{data ? "Исправьте данные" : "Данные документа"}</PanelTitle>
          <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="v-lastName" label="Фамилия" error={errors.lastName}>
                <Input id="v-lastName" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} {...aria("lastName")} />
              </Field>
              <Field id="v-firstName" label="Имя" error={errors.firstName}>
                <Input id="v-firstName" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} {...aria("firstName")} />
              </Field>
              <Field id="v-middleName" label="Отчество" error={errors.middleName} hint="Если есть">
                <Input id="v-middleName" autoComplete="additional-name" value={form.middleName} onChange={set("middleName")} {...aria("middleName")} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="v-birthDate" label="Дата рождения" error={errors.birthDate}>
                <Input id="v-birthDate" type="date" max={maxBirth} autoComplete="bday" value={form.birthDate} onChange={set("birthDate")} {...aria("birthDate")} />
              </Field>
              <Field id="v-citizenship" label="Гражданство" error={errors.citizenship}>
                <select id="v-citizenship" className={selectClass} value={form.citizenship} onChange={set("citizenship")} {...aria("citizenship")}>
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
                <select id="v-documentType" className={selectClass} value={form.documentType} onChange={set("documentType")} {...aria("documentType")}>
                  {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="v-documentNumber" label="Серия и номер" error={errors.documentNumber} hint={belarusian ? "Например MP1234567" : undefined}>
                <Input
                  id="v-documentNumber"
                  autoCapitalize="characters"
                  className="uppercase"
                  value={form.documentNumber}
                  onChange={set("documentNumber")}
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
              <Input
                id="v-personalNumber"
                autoCapitalize="characters"
                maxLength={20}
                className="uppercase"
                value={form.personalNumber}
                onChange={set("personalNumber")}
                {...aria("personalNumber")}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="v-phone" label="Телефон" error={errors.phone}>
                <Input id="v-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} {...aria("phone")} />
              </Field>
              <Field id="v-address" label="Адрес регистрации" error={errors.address}>
                <Input id="v-address" autoComplete="street-address" value={form.address} onChange={set("address")} {...aria("address")} />
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
