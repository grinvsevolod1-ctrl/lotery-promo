"use client"

import { MAX_NUMBER, NUMBERS_PER_TICKET } from "@/lib/lottery"
import { cn } from "@/lib/utils"

const ALL_NUMBERS = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1)

export function NumberPicker({
  value,
  onChange,
  disabled,
}: {
  value: number[]
  onChange: (next: number[]) => void
  disabled?: boolean
}) {
  const full = value.length >= NUMBERS_PER_TICKET

  const toggle = (n: number) => {
    if (value.includes(n)) onChange(value.filter((v) => v !== n))
    else if (!full) onChange([...value, n].sort((a, b) => a - b))
  }

  return (
    <div
      role="group"
      aria-label={`Выберите ${NUMBERS_PER_TICKET} чисел от 1 до ${MAX_NUMBER}`}
      className="grid grid-cols-9 gap-1.5 sm:gap-2"
    >
      {ALL_NUMBERS.map((n) => {
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
              "grid aspect-square place-items-center rounded-full font-display text-sm font-extrabold tabular-nums transition-all",
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
