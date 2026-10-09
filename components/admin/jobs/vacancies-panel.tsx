"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react"
import { deleteVacancy, saveVacancy, toggleVacancy } from "@/app/actions/admin-jobs"
import type { ActionResult } from "@/app/actions/admin-players"
import { ActionMessage, fieldClass, labelClass } from "@/components/admin/player-form-ui"
import { EMPLOYMENT_TYPES, type VacancyView } from "@/lib/jobs"

export function VacanciesPanel({ vacancies, applicationCounts }: { vacancies: VacancyView[]; applicationCounts: Record<number, number> }) {
  const [creating, setCreating] = useState(false)

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5" aria-labelledby="vacancies-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="vacancies-heading" className="font-display text-lg font-bold text-foreground">
          Вакансии <span className="text-muted-foreground">({vacancies.length})</span>
        </h2>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" aria-hidden="true" />
          {creating ? "Скрыть форму" : "Новая вакансия"}
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <VacancyForm onDone={() => setCreating(false)} />
        </div>
      )}

      {vacancies.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Вакансий пока нет</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {vacancies.map((vacancy) => (
            <li key={vacancy.id}>
              <VacancyItem vacancy={vacancy} applications={applicationCounts[vacancy.id] ?? 0} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function VacancyItem({ vacancy, applications }: { vacancy: VacancyView; applications: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const res = await action()
      setResult(res)
      router.refresh()
    })

  return (
    <article className={`rounded-2xl border p-4 ${vacancy.active ? "border-border/60 bg-background" : "border-dashed border-border bg-background/50 opacity-75"}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{vacancy.department}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{EMPLOYMENT_TYPES[vacancy.employment]}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{vacancy.location}</span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs tabular-nums text-foreground">анкет: {applications}</span>
          </span>
          <span className="flex w-full items-center gap-2">
            <span className="min-w-0 flex-1 font-semibold leading-snug text-foreground text-pretty">{vacancy.title}</span>
            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
        </button>

        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <span className="sr-only sm:not-sr-only">{vacancy.active ? "Опубл." : "Скрыта"}</span>
          <input
            type="checkbox"
            role="switch"
            checked={vacancy.active}
            disabled={pending}
            onChange={(e) => run(() => toggleVacancy(vacancy.id, e.target.checked))}
            className="peer sr-only"
            aria-label={`Вакансия «${vacancy.title}» опубликована`}
          />
          <span
            aria-hidden="true"
            className="relative h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-background after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
          />
        </label>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-border/60 pt-4">
          {editing ? (
            <VacancyForm vacancy={vacancy} onDone={() => setEditing(false)} />
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">{vacancy.summary}</p>
              <p className="font-mono text-xs text-muted-foreground">/jobs/{vacancy.slug}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm text-foreground hover:bg-foreground/5"
                >
                  <Pencil className="size-3.5" aria-hidden="true" /> Изменить
                </button>
                <a
                  href={`/jobs/${vacancy.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm text-foreground hover:bg-foreground/5"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" /> Открыть страницу
                </a>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Удалить вакансию «${vacancy.title}»? Все анкеты по ней тоже будут удалены.`)) run(() => deleteVacancy(vacancy.id))
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" /> Удалить
                </button>
              </div>
            </>
          )}
          <ActionMessage state={result} />
        </div>
      )}
    </article>
  )
}

function TextArea({ name, label, value, rows = 4, hint }: { name: string; label: string; value?: string; rows?: number; hint?: string }) {
  return (
    <label className={`${labelClass} sm:col-span-2`}>
      {label}
      <textarea name={name} rows={rows} defaultValue={value} className={`${fieldClass} h-auto py-2.5 leading-relaxed`} />
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  )
}

function VacancyForm({ vacancy, onDone }: { vacancy?: VacancyView; onDone: () => void }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveVacancy, null)

  useEffect(() => {
    if (state?.ok) {
      router.refresh()
      onDone()
    }
  }, [state, router, onDone])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {vacancy && <input type="hidden" name="id" value={vacancy.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Название
          <input name="title" required maxLength={120} defaultValue={vacancy?.title} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Отдел
          <input name="department" required maxLength={80} defaultValue={vacancy?.department} className={fieldClass} placeholder="Поддержка игроков" />
        </label>
        <label className={labelClass}>
          Город / формат
          <input name="location" required maxLength={80} defaultValue={vacancy?.location} className={fieldClass} placeholder="Минск / удалённо" />
        </label>
        <label className={labelClass}>
          Занятость
          <select name="employment" defaultValue={vacancy?.employment ?? "full_time"} className={fieldClass}>
            {Object.entries(EMPLOYMENT_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Зарплата
          <input name="salary" maxLength={80} defaultValue={vacancy?.salary ?? ""} className={fieldClass} placeholder="от 1 800 BYN" />
        </label>
        <label className={labelClass}>
          Адрес страницы (slug)
          <input name="slug" maxLength={60} defaultValue={vacancy?.slug ?? ""} className={`${fieldClass} font-mono`} placeholder="пусто — из названия" />
        </label>
        <label className={labelClass}>
          Порядок
          <input name="sortOrder" type="number" min="0" max="10000" defaultValue={vacancy?.sortOrder ?? 0} className={fieldClass} />
        </label>
        <TextArea name="summary" label="Коротко для карточки" value={vacancy?.summary} rows={2} hint="1–2 предложения, до 300 символов" />
        <TextArea name="description" label="Описание" value={vacancy?.description} rows={6} hint="Абзацы разделяйте пустой строкой" />
        <TextArea name="responsibilities" label="Чем предстоит заниматься" value={vacancy?.responsibilities.join("\n")} hint="Каждый пункт с новой строки" />
        <TextArea name="requirements" label="Что мы ждём" value={vacancy?.requirements.join("\n")} hint="Каждый пункт с новой строки" />
        <TextArea name="benefits" label="Что предлагаем" value={vacancy?.benefits.join("\n")} hint="Каждый пункт с новой строки" />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="active" defaultChecked={vacancy?.active ?? true} className="size-4 accent-primary" />
        Опубликовать на сайте
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="h-10 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {pending ? "Сохраняю…" : vacancy ? "Сохранить" : "Создать вакансию"}
        </button>
        <button type="button" onClick={onDone} className="h-10 rounded-full border border-border px-5 text-sm text-foreground hover:bg-foreground/5">
          Отмена
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}
