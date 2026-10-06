import { Clover as CloverMark } from "lucide-react"
import { ScratchSymbolBadge } from "@/components/games/scratch/scratch-symbol"
import type { ScratchSymbol } from "@/lib/games/scratch"
import { BallRow } from "@/components/lotto-ball"
import { formatDateTime } from "@/lib/format"
import { parseNumbers } from "@/lib/lottery"
import type { TicketRow } from "@/app/actions/cabinet"
import { cn } from "@/lib/utils"

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Обрабатывается", cls: "bg-foreground/10 text-foreground/70" },
  win: { label: "Выигрыш", cls: "bg-gold text-gold-foreground shadow-md shadow-gold/30" },
  lose: { label: "Без выигрыша", cls: "bg-foreground/10 text-muted-foreground" },
}

type GameDetailsData =
  | { kind: "plinko"; rows: number; risk: string; multiplier: number }
  | { kind: "scratch"; fields: ScratchSymbol[]; matches: number; multiplier: number; winningSymbol: ScratchSymbol | null }

const RISK_LABELS: Record<string, string> = { low: "Минимум", medium: "Средний", high: "Высокий" }

function readDetails(value: unknown): GameDetailsData | null {
  if (!value || typeof value !== "object") return null
  const kind = (value as { kind?: unknown }).kind
  return kind === "plinko" || kind === "scratch" ? (value as GameDetailsData) : null
}

function GameDetails({ details, cost }: { details: GameDetailsData; cost: number }) {
  if (details.kind === "plinko") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-foreground/10 px-2.5 py-1">Ставка {cost} BYN</span>
        <span className="rounded-full bg-foreground/10 px-2.5 py-1">Риск: {RISK_LABELS[details.risk] ?? details.risk}</span>
        <span className="rounded-full bg-foreground/10 px-2.5 py-1">{details.rows} пинов</span>
        <span className="rounded-full bg-primary/15 px-2.5 py-1 font-bold text-primary">x{details.multiplier}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {details.fields.map((s, i) => (
          <ScratchSymbolBadge
            key={i}
            symbol={s}
            className={cn("w-8", details.winningSymbol && s !== details.winningSymbol && "opacity-35 grayscale")}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Билет {cost} BYN · {details.matches > 0 ? `${details.matches} одинаковых, x${details.multiplier}` : "без совпадений"}
      </p>
    </div>
  )
}

export function TicketCard({ ticket }: { ticket: TicketRow }) {
  const status = STATUS[ticket.status] ?? STATUS.pending
  const details = readDetails(ticket.details)
  const numbers = details ? [] : parseNumbers(ticket.numbers)
  const winning = ticket.winningNumbers ? parseNumbers(ticket.winningNumbers) : null
  const hits = new Set(winning ?? [])
  const isWin = ticket.status === "win"

  return (
    <li
      className={cn(
        "grain relative flex overflow-hidden rounded-2xl border bg-card",
        isWin ? "border-gold/50 shadow-lg shadow-gold/10" : "border-border/60",
      )}
    >
      {/* Stub: perforated edge with punched notches */}
      <div className="relative flex w-16 shrink-0 flex-col items-center justify-between border-r border-dashed border-foreground/25 bg-gradient-to-b from-primary/30 to-accent/10 py-4 sm:w-20">
        <CloverMark className={cn("size-6", isWin ? "text-gold" : "text-foreground/70")} />
        <span className="rotate-180 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-foreground/60 [writing-mode:vertical-rl]">
          № {String(ticket.id).padStart(6, "0")}
        </span>
        <span aria-hidden className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-background" />
        <span aria-hidden className="absolute -bottom-2.5 -right-2.5 size-5 rounded-full bg-background" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold text-foreground">{ticket.game}</p>
            <p className="text-xs text-muted-foreground">
              {details?.kind === "plinko" ? "Plinko" : details?.kind === "scratch" ? "Скретч-билет" : "Моментальный"} ·{" "}
              {formatDateTime(ticket.createdAt)}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-bold", status.cls)}>
            {isWin ? `+${ticket.prize} BYN` : status.label}
          </span>
        </div>

        {details ? (
          <GameDetails details={details} cost={ticket.cost} />
        ) : (
          <BallRow numbers={numbers} highlight={hits} size="md" />
        )}

        {!details && winning && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Выпало:</span>
            <BallRow numbers={winning} size="sm" tone="muted" />
            <span className="ml-auto font-semibold text-foreground/80">Совпадений: {ticket.matches}</span>
          </div>
        )}
      </div>
    </li>
  )
}
