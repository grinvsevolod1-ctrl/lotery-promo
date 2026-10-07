"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Megaphone, Pencil, Plus, Trash2 } from "lucide-react"
import { announceBonusOffer, deleteBonusOffer, saveBonusOffer, toggleBonusOffer } from "@/app/actions/admin-bonuses"
import type { ActionResult } from "@/app/actions/admin-players"
import {
  OFFER_AUDIENCES,
  OFFER_CATEGORIES,
  OFFER_KINDS,
  offerConditions,
  offerHeadline,
  type BonusOfferRow,
  type OfferCategory,
} from "@/lib/bonus-offers"
import { ActionMessage, fieldClass, labelClass } from "@/components/admin/player-form-ui"

type Games = { slots: string[]; live: string[] }
type Filter = "all" | OfferCategory | "off"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "slots", label: "Слоты" },
  { value: "live", label: "Live" },
  { value: "off", label: "Выключенные" },
]

export function BonusOffersPanel({ offers, games }: { offers: BonusOfferRow[]; games: Games }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [creating, setCreating] = useState(false)
  const visible = offers.filter((o) =>
    filter === "all" ? true : filter === "off" ? !o.active : o.category === filter,
  )

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5" aria-labelledby="offers-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="offers-heading" className="font-display text-lg font-bold text-foreground">
          Акции <span className="text-muted-foreground">({visible.length})</span>
        </h2>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" aria-hidden="true" />
          {creating ? "Скрыть форму" : "Новый бонус"}
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <OfferForm games={games} onDone={() => setCreating(false)} />
        </div>
      )}

      <div role="tablist" aria-label="Фильтр акций" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={
              filter === f.value
                ? "rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background"
                : "rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Здесь пока пусто</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((offer) => (
            <li key={offer.id}>
              <OfferItem offer={offer} games={games} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function OfferItem({ offer, games }: { offer: BonusOfferRow; games: Games }) {
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
    <article className={`rounded-2xl border p-4 ${offer.active ? "border-border/60 bg-background" : "border-dashed border-border bg-background/50 opacity-75"}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{offerHeadline(offer)}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{OFFER_KINDS[offer.kind]}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{OFFER_CATEGORIES[offer.category]}</span>
            {offer.promoCode && (
              <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-xs text-foreground">{offer.promoCode}</span>
            )}
          </span>
          <span className="flex w-full items-center gap-2">
            <span className="min-w-0 flex-1 font-semibold leading-snug text-foreground text-pretty">{offer.title}</span>
            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
        </button>

        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <span className="sr-only sm:not-sr-only">{offer.active ? "Вкл." : "Выкл."}</span>
          <input
            type="checkbox"
            role="switch"
            checked={offer.active}
            disabled={pending}
            onChange={(e) => run(() => toggleBonusOffer(offer.id, e.target.checked))}
            className="peer sr-only"
            aria-label={`Бонус «${offer.title}» включён`}
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
            <OfferForm offer={offer} games={games} onDone={() => setEditing(false)} />
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">{offer.description}</p>
              <ul className="grid gap-x-6 gap-y-1.5 text-sm text-foreground sm:grid-cols-2">
                {offerConditions(offer).map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm text-foreground hover:bg-foreground/5"
                >
                  <Pencil className="size-3.5" aria-hidden="true" /> Изменить
                </button>
                <button
                  type="button"
                  disabled={pending || !offer.active}
                  onClick={() => run(() => announceBonusOffer(offer.id, false))}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50"
                >
                  <Megaphone className="size-3.5" aria-hidden="true" /> Уведомить игроков
                </button>
                <button
                  type="button"
                  disabled={pending || !offer.active}
                  onClick={() => {
                    if (confirm("Разослать акцию всем игрокам в уведомления и на почту?")) run(() => announceBonusOffer(offer.id, true))
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Megaphone className="size-3.5" aria-hidden="true" /> Уведомить + e-mail
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Удалить бонус «${offer.title}»?`)) run(() => deleteBonusOffer(offer.id))
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

function NumberField({ name, label, value, step = "1", hint }: { name: string; label: string; value?: number | null; step?: string; hint?: string }) {
  return (
    <label className={labelClass}>
      {label}
      <input name={name} type="number" inputMode="decimal" min="0" step={step} defaultValue={value ?? ""} className={fieldClass} />
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  )
}

function OfferForm({ offer, games, onDone }: { offer?: BonusOfferRow; games: Games; onDone: () => void }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveBonusOffer, null)
  const [category, setCategory] = useState<OfferCategory>(offer?.category ?? "slots")
  const gameOptions = category === "all" ? [] : games[category]

  useEffect(() => {
    if (state?.ok) {
      router.refresh()
      onDone()
    }
  }, [state, router, onDone])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {offer && <input type="hidden" name="id" value={offer.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Название
          <input name="title" required maxLength={120} defaultValue={offer?.title} className={fieldClass} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Описание для игроков
          <textarea
            name="description"
            required
            maxLength={600}
            rows={3}
            defaultValue={offer?.description}
            className={`${fieldClass} h-auto py-2.5 leading-relaxed`}
          />
        </label>
        <label className={labelClass}>
          Тип бонуса
          <select name="kind" defaultValue={offer?.kind ?? "deposit_match"} className={fieldClass}>
            {Object.entries(OFFER_KINDS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Категория игр
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value as OfferCategory)} className={fieldClass}>
            {Object.entries(OFFER_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Игра
          <select name="gameTitle" defaultValue={offer?.gameTitle ?? ""} disabled={category === "all"} className={fieldClass}>
            <option value="">Все игры категории</option>
            {gameOptions.map((title) => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Для кого
          <select name="audience" defaultValue={offer?.audience ?? "all"} className={fieldClass}>
            {Object.entries(OFFER_AUDIENCES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">Размер бонуса</legend>
        <NumberField name="percent" label="Процент, %" value={offer?.percent} />
        <NumberField name="amount" label="Сумма, BYN" value={offer?.amount} step="0.01" />
        <NumberField name="maxBonus" label="Максимум, BYN" value={offer?.maxBonus} step="0.01" />
        <NumberField name="minDeposit" label="Мин. пополнение" value={offer?.minDeposit} step="0.01" />
        <NumberField name="freeSpins" label="Фриспины, шт." value={offer?.freeSpins} />
        <NumberField name="spinValue" label="Цена спина, BYN" value={offer?.spinValue} step="0.01" />
        <NumberField name="maxWin" label="Макс. выигрыш" value={offer?.maxWin} step="0.01" />
        <NumberField name="sortOrder" label="Порядок" value={offer?.sortOrder} />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">Условия</legend>
        <NumberField name="wager" label="Вейджер, x" value={offer?.wager ?? 35} hint="0 — без отыгрыша" />
        <NumberField name="wagerContribution" label="Вклад в отыгрыш, %" value={offer?.wagerContribution ?? 100} hint="Live обычно 10–20%" />
        <NumberField name="validDays" label="Срок, дней" value={offer?.validDays ?? 7} />
        <label className={labelClass}>
          Промокод
          <input
            name="promoCode"
            maxLength={24}
            defaultValue={offer?.promoCode ?? ""}
            autoCapitalize="characters"
            className={`${fieldClass} font-mono uppercase`}
          />
        </label>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="active" defaultChecked={offer?.active ?? true} className="size-4 accent-primary" />
        Показывать игрокам
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="h-10 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {pending ? "Сохраняю…" : offer ? "Сохранить" : "Создать бонус"}
        </button>
        <button type="button" onClick={onDone} className="h-10 rounded-full border border-border px-5 text-sm text-foreground hover:bg-foreground/5">
          Отмена
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}
