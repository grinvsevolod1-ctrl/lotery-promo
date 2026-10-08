"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { NINJA_RANKS, formatNinjaMultiplier, type NinjaRankId } from "@/lib/games/ninja"
import { cn } from "@/lib/utils"

const KAGE_REVEALS = NINJA_RANKS[NINJA_RANKS.length - 1].reveals

/** Headband-style progress: how far along the path the player is and which ranks are locked in. */
export function RankBar({ reveals, rank, refund, maxReveals }: { reveals: number; rank: NinjaRankId | null; refund: number; maxReveals: number }) {
  const span = Math.min(KAGE_REVEALS, maxReveals)
  const progress = Math.min(1, reveals / span)
  return (
    <div className="ninja flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-muted-foreground">
          Открыто <span className="tabular-nums text-foreground">{reveals}</span> из {maxReveals}
        </span>
        <span className={cn("font-bold tabular-nums", refund > 0 ? "text-[var(--ninja-gold)]" : "text-muted-foreground")}>
          {refund > 0 ? `Закреплено ${formatNinjaMultiplier(refund)}` : "Страховки пока нет"}
        </span>
      </div>
      {/* Side padding keeps the first and last markers (and their labels) inside the card. */}
      <div className="relative mx-5 h-11">
        <div className="absolute inset-x-0 top-3.5 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className={cn(
            "absolute left-0 top-3.5 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-[var(--ninja-chakra)] to-[var(--ninja-gold)] transition-[width] duration-500 ease-out",
            progress > 0 && "ninja-progress-head",
          )}
          style={{ width: `${progress * 100}%` }}
        />
        <ol className="absolute inset-x-0 top-0 flex">
          {NINJA_RANKS.map((r) => {
            const reachable = r.reveals <= maxReveals
            const reached = reveals >= r.reveals
            const active = rank === r.id
            return (
              <li
                key={r.id}
                className="absolute -translate-x-1/2"
                style={{ left: `${Math.min(100, (r.reveals / span) * 100)}%` }}
                aria-label={`${r.label}: ${r.reveals} свитков${reached ? ", достигнут" : ""}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-[10px] font-black ring-2 transition",
                      reached
                        ? "bg-[var(--ninja-gold)] text-[var(--ninja-ink)] ring-[var(--ninja-gold)]"
                        : "bg-card text-muted-foreground ring-border",
                      active && "ninja-bump scale-110 shadow-lg shadow-[var(--ninja-gold)]/40",
                      !reachable && "opacity-40",
                    )}
                  >
                    {r.id === "kage" ? <Image src="/games/ninja/kage.webp" alt="" width={28} height={28} className="size-7 rounded-full" /> : r.reveals}
                  </span>
                  <span className={cn("text-[9px] font-bold uppercase tracking-wide", reached ? "text-foreground" : "text-muted-foreground")}>{r.label}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

/** Horizontal strip of the expected multipliers; the current step stays in view. */
export function LadderStrip({ ladder, current, stake }: { ladder: readonly number[]; current: number; stake: number }) {
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const el = listRef.current?.children[Math.max(0, current - 1)] as HTMLElement | undefined
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [current])

  return (
    <ol ref={listRef} className="ninja -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Лестница множителей">
      {ladder.slice(1).map((m, i) => {
        const step = i + 1
        const rank = NINJA_RANKS.find((r) => r.reveals === step)
        const isCurrent = step === current
        const passed = step < current
        return (
          <li
            key={step}
            className={cn(
              "flex shrink-0 flex-col items-center rounded-xl px-2.5 py-1.5 ring-1 transition",
              isCurrent ? "bg-primary text-primary-foreground ring-primary" : passed ? "bg-secondary text-muted-foreground ring-border" : "bg-card text-foreground ring-border",
              rank && !isCurrent && "ring-[var(--ninja-gold)]/70",
            )}
          >
            <span className="font-display text-xs font-black tabular-nums">{formatNinjaMultiplier(m)}</span>
            <span className={cn("text-[9px] font-bold tabular-nums", isCurrent ? "text-primary-foreground/80" : "text-muted-foreground")}>
              {rank ? rank.label : `${(stake * m).toFixed(2).replace(".", ",")} BYN`}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
