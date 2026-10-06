"use client"

import { useState, useTransition } from "react"
import { setLuckLevel, type LuckSettingsData } from "@/app/actions/admin"
import { LUCK_CONFIRM_FROM, LUCK_GAME_ROWS, LUCK_LEVELS, expectedReturnBestOf } from "@/lib/luck"
import { WELCOME_BONUS } from "@/lib/lottery"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}

function formatValue(value: number, unit: "ratio" | "byn") {
  return unit === "ratio" ? `${Math.round(value * 100)}%` : `${value.toFixed(1).replace(".", ",")} BYN`
}

export function LuckSettings({ settings }: { settings: LuckSettingsData }) {
  const [selected, setSelected] = useState(settings.attempts)
  const [saved, setSaved] = useState(settings.attempts)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const keno = LUCK_GAME_ROWS[0]
  const kenoReturn = expectedReturnBestOf(keno.distribution, selected)

  const save = () => {
    if (selected >= LUCK_CONFIRM_FROM && !window.confirm(`Включить буст x${selected}? Игроки будут в среднем выигрывать больше, чем ставят.`)) return
    startTransition(async () => {
      const result = await setLuckLevel(selected)
      if (result.ok) {
        setSaved(selected)
        setMessage({ ok: true, text: selected === 1 ? "Буст выключен" : `Буст x${selected} включён` })
      } else {
        setMessage({ ok: false, text: result.error })
      }
    })
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">Буст удачи</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${saved > 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {saved > 1 ? `Включён x${saved}` : "Выключен"}
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Глобально для всех игроков и всех игр. На уровне xN сервер разыгрывает раунд N раз и засчитывает лучшую попытку. Таблицы выплат не меняются.
      </p>

      <fieldset className="mt-4">
        <legend className="sr-only">Уровень буста</legend>
        <div className="flex flex-wrap gap-2">
          {LUCK_LEVELS.map((level) => (
            <label
              key={level.attempts}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                selected === level.attempts ? "border-primary bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:bg-foreground/5"
              }`}
            >
              <input
                type="radio"
                name="luck-level"
                value={level.attempts}
                checked={selected === level.attempts}
                onChange={() => setSelected(level.attempts)}
                className="sr-only"
              />
              {level.label}
              {level.attempts > 1 && <span className="ml-1 font-semibold">x{level.attempts}</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-4 text-sm text-foreground">
        {"Приветственные "}{WELCOME_BONUS}{" BYN в КЕНО в среднем превращаются в "}
        <strong className="text-primary">{Math.round(WELCOME_BONUS * kenoReturn)} BYN</strong>
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">Игра</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Без буста</th>
              <th scope="col" className="py-2 text-right font-medium">{`x${selected}`}</th>
            </tr>
          </thead>
          <tbody>
            {LUCK_GAME_ROWS.map((row) => {
              const base = expectedReturnBestOf(row.distribution, 1)
              const boosted = expectedReturnBestOf(row.distribution, selected)
              const overBank = row.unit === "ratio" && boosted >= 1
              return (
                <tr key={row.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 pr-3 text-foreground">{row.name}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{formatValue(base, row.unit)}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${overBank ? "text-primary" : "text-foreground"}`}>{formatValue(boosted, row.unit)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Процент — средний возврат от ставки. Больше 100% значит, что игроки в среднем выигрывают больше, чем ставят.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || selected === saved}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Сохраняю..." : "Сохранить"}
        </button>
        {message && <p className={`text-sm ${message.ok ? "text-emerald-500" : "text-destructive"}`}>{message.text}</p>}
      </div>
      {settings.updatedAt && <p className="mt-2 text-xs text-muted-foreground">{`Последнее изменение: ${formatDate(settings.updatedAt)}`}</p>}
    </section>
  )
}
