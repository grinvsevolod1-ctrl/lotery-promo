"use client"

import { useActionState, useRef, useState } from "react"
import { Megaphone } from "lucide-react"
import { sendBroadcast, type ActionResult } from "@/app/actions/admin-players"
import { ActionMessage, fieldClass, labelClass } from "@/components/admin/player-form-ui"

const PRESETS = [
  {
    label: "Бонус на депозит",
    kind: "bonus",
    title: "+50% к пополнению сегодня",
    body: "Пополните баланс от 100 BYN и получите бонус 50% от суммы.\n\nБонус нужно отыграть перед выводом.",
    ctaLabel: "Пополнить",
    ctaUrl: "/cabinet/deposit",
  },
  {
    label: "Бесплатный билет",
    kind: "bonus",
    title: "Бесплатный билет в подарок",
    body: "Для вас доступен бесплатный билет в ближайший тираж. Заберите его в разделе бонусов.",
    ctaLabel: "Забрать бонус",
    ctaUrl: "/cabinet/bonuses",
  },
  {
    label: "Пройти верификацию",
    kind: "system",
    audience: "unverified",
    title: "Подтвердите личность",
    body: "Чтобы выводить выигрыши, пройдите верификацию — это займёт пару минут.",
    ctaLabel: "Пройти верификацию",
    ctaUrl: "/cabinet/verification",
  },
] as const

export function BroadcastForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(sendBroadcast, null)
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function applyPreset(preset: (typeof PRESETS)[number]) {
    const form = formRef.current
    if (!form) return
    const set = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
      if (el) el.value = value
    }
    set("title", preset.title)
    set("body", preset.body)
    set("kind", preset.kind)
    set("ctaLabel", preset.ctaLabel)
    set("ctaUrl", preset.ctaUrl)
    set("audience", "audience" in preset ? preset.audience : "active")
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5" aria-labelledby="broadcast-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="broadcast-heading" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <Megaphone className="size-5 text-primary" aria-hidden />
          Рассылка
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-muted"
        >
          {open ? "Свернуть" : "Новая рассылка"}
        </button>
      </div>

      {open && (
        <form ref={formRef} action={action} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Шаблоны:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted/70"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Кому
              <select name="audience" defaultValue="active" className={fieldClass}>
                <option value="active">Все активные пользователи</option>
                <option value="unverified">Без верификации</option>
              </select>
            </label>
            <label className={labelClass}>
              Тип уведомления
              <select name="kind" defaultValue="bonus" className={fieldClass}>
                <option value="bonus">Бонус / акция</option>
                <option value="system">Системное</option>
                <option value="money">Финансы</option>
              </select>
            </label>
          </div>

          <label className={labelClass}>
            Заголовок
            <input name="title" required maxLength={120} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Текст
            <textarea name="body" required rows={5} maxLength={3000} className={`${fieldClass} h-auto py-3`} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Текст кнопки
              <input name="ctaLabel" maxLength={40} placeholder="Подробнее" className={fieldClass} />
            </label>
            <label className={labelClass}>
              Ссылка кнопки
              <input name="ctaUrl" maxLength={300} placeholder="/cabinet/bonuses" className={fieldClass} />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="sendEmail" defaultChecked className="size-4 accent-primary" />
            Также отправить на почту
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {pending ? "Отправка…" : "Отправить рассылку"}
            </button>
            <ActionMessage state={state} />
          </div>
        </form>
      )}
    </section>
  )
}
