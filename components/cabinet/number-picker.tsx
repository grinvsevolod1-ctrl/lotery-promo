"use client"

import { cn } from "@/lib/utils"

export function NumberPicker({
  value,
  onChange,
  pick,
  max,
  disabled,
}: {
  value: number[]
  onChange: (next: number[]) => void
  pick: number
  max: number
  disabled?: boolean
}) {
  const full = value.length >= pick
  const all = Array.from({ length: max }, (_, i) => i + 1)

  const toggle = (n: number) => {
    if (value.includes(n)) onChange(value.filter((v) => v !== n))
    else if (!full) onChange([...value, n].sort((a, b) => a - b))
  }

  return (
    <div
      role="group"
      aria-label={`Выберите ${pick} из ${max}`}
      className={cn(
        "grid w-full max-w-xl gap-1.5 sm:gap-2",
        max <= 20 ? "grid-cols-5 min-[480px]:grid-cols-10" : "grid-cols-6 min-[480px]:grid-cols-9",
      )}
    >
      {all.map((n) => {
        const selected = value.includes(n)
        const blocked = disabled || (full && !selected)
        return (
          <button
            key={n}
            type="button"
            onClick={() => toggle(n)}
            disabled={disabled}
            aria-pressed={selected}
            aria-disabled={blocked || undefined}
            className={cn(
              "grid aspect-square min-h-9 place-items-center rounded-full font-display text-sm font-extrabold sm:text-base tabular-nums transition-all",
              selected
                ? "scale-105 bg-[radial-gradient(circle_at_30%_28%,oklch(0.95_0.1_90),oklch(0.78_0.16_80)_70%)] text-gold-foreground shadow-[0_0_16px_-2px_oklch(0.82_0.15_85/0.8)] ring-2 ring-gold/70"
                : blocked
                  ? "bg-foreground/5 text-muted-foreground/40"
                  : "bg-foreground/10 text-foreground/80 hover:bg-primary/30 hover:text-foreground",
            )}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}
