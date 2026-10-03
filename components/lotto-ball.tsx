import { cn } from "@/lib/utils"

type Tone = "default" | "hit" | "muted" | "ghost"
type Size = "sm" | "md" | "lg"

const SIZES: Record<Size, string> = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-11 text-base",
}

const TONES: Record<Tone, string> = {
  default:
    "bg-[radial-gradient(circle_at_30%_28%,oklch(0.55_0.2_305),oklch(0.3_0.12_300)_70%)] text-foreground ring-1 ring-foreground/15 shadow-[inset_0_-3px_6px_oklch(0_0_0/0.35),0_4px_10px_-4px_oklch(0_0_0/0.6)]",
  hit:
    "bg-[radial-gradient(circle_at_30%_28%,oklch(0.95_0.1_90),oklch(0.78_0.16_80)_70%)] text-gold-foreground ring-2 ring-gold/70 shadow-[inset_0_-3px_6px_oklch(0.5_0.12_70/0.5),0_0_18px_-2px_oklch(0.82_0.15_85/0.8)]",
  muted: "bg-foreground/10 text-muted-foreground ring-1 ring-foreground/10",
  ghost: "border border-dashed border-foreground/25 text-muted-foreground/60",
}

export function LottoBall({
  value,
  tone = "default",
  size = "md",
  className,
}: {
  value: number | string
  tone?: Tone
  size?: Size
  className?: string
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-display font-extrabold tabular-nums leading-none",
        SIZES[size],
        TONES[tone],
        className,
      )}
    >
      {value}
    </span>
  )
}

/** A row of balls; numbers found in `highlight` are rendered as golden hits. */
export function BallRow({
  numbers,
  highlight,
  size = "md",
  tone = "default",
  className,
}: {
  numbers: readonly number[]
  highlight?: ReadonlySet<number>
  size?: Size
  tone?: Tone
  className?: string
}) {
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {numbers.map((n) => (
        <LottoBall key={n} value={n} size={size} tone={highlight?.has(n) ? "hit" : tone} />
      ))}
    </span>
  )
}
