"use client"

import Image from "next/image"
import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { NINJA_CELLS, NINJA_RANKS, NINJA_SIZE, formatNinjaMultiplier, type NinjaRankId, type NinjaState } from "@/lib/games/ninja"
import { cn } from "@/lib/utils"

export type TileKind = "closed" | "safe" | "sharingan" | "sealed" | "trap" | "bust"

export type NinjaBoardHandle = {
  /** Flies a kunai from the bottom edge to `cell`; resolves at impact. */
  throwKunai: (cell: number) => Promise<void>
}

type Props = {
  state: NinjaState | null
  trapCells: number[] | null
  disabled: boolean
  onOpen: (cell: number) => void
  pickMode: boolean
  picks: number[]
  onTogglePick: (cell: number) => void
  /** True for ~1.5 s after a bust: the field inverts into the Tsukuyomi world. */
  tsukuyomi: boolean
  rankUp: { id: NinjaRankId; refund: number; key: number } | null
  /** Changes whenever the field is reset; remounts the grid so tiles deal in again. */
  dealKey: number | string
  /** Changes on every win; fires a gold spark burst. 0 = nothing. */
  burstKey: number
}

const BURST = Array.from({ length: 18 }, (_, i) => ({
  angle: `${i * 20}deg`,
  radius: `${120 + (i % 3) * 50}px`,
  delay: `${(i % 4) * 40}ms`,
}))

const ART: Record<Exclude<TileKind, "closed">, string> = {
  safe: "/games/ninja/chakra.webp",
  sharingan: "/games/ninja/sharingan.webp",
  sealed: "/games/ninja/trap.webp",
  trap: "/games/ninja/trap.webp",
  bust: "/games/ninja/trap.webp",
}

export function tileKind(state: NinjaState | null, trapCells: number[] | null, cell: number): TileKind {
  if (!state) return "closed"
  if (state.revealed.includes(cell)) return state.sharingan.includes(cell) ? "sharingan" : "safe"
  if (state.sealed.includes(cell)) return "sealed"
  if (trapCells?.includes(cell)) return cell === state.bustCell ? "bust" : "trap"
  return "closed"
}

const KUNAI_MS = 260

export const NinjaBoard = forwardRef<NinjaBoardHandle, Props>(function NinjaBoard(
  { state, trapCells, disabled, onOpen, pickMode, picks, onTogglePick, tsukuyomi, rankUp, dealKey, burstKey },
  ref,
) {
  const boardRef = useRef<HTMLDivElement>(null)
  const kunaiRef = useRef<HTMLDivElement>(null)
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [hit, setHit] = useState<{ cell: number; key: number } | null>(null)
  const hitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The shake class must come off again so the next impact can replay it.
  const impact = (cell: number) => {
    setHit({ cell, key: Date.now() })
    if (hitTimer.current) clearTimeout(hitTimer.current)
    hitTimer.current = setTimeout(() => setHit(null), 600)
  }

  useImperativeHandle(ref, () => ({
    throwKunai: (cell) =>
      new Promise((resolve) => {
        const board = boardRef.current
        const kunai = kunaiRef.current
        const tile = tileRefs.current[cell]
        if (!board || !kunai || !tile || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          impact(cell)
          resolve()
          return
        }
        const b = board.getBoundingClientRect()
        const t = tile.getBoundingClientRect()
        const fromX = b.width / 2
        const fromY = b.height + 40
        const toX = t.left - b.left + t.width / 2
        const toY = t.top - b.top + t.height / 2
        const angle = (Math.atan2(toY - fromY, toX - fromX) * 180) / Math.PI + 90
        kunai.style.opacity = "1"
        const anim = kunai.animate(
          [
            { transform: `translate(${fromX}px, ${fromY}px) rotate(${angle}deg) scale(1.1)` },
            { transform: `translate(${toX}px, ${toY}px) rotate(${angle + 20}deg) scale(0.8)` },
          ],
          { duration: KUNAI_MS, easing: "cubic-bezier(0.3, 0, 0.7, 1)", fill: "forwards" },
        )
        anim.onfinish = () => {
          kunai.style.opacity = "0"
          impact(cell)
          resolve()
        }
      }),
  }))

  const rank = rankUp ? NINJA_RANKS.find((r) => r.id === rankUp.id) : null

  return (
    <div
      ref={boardRef}
      className={cn("ninja relative isolate overflow-hidden rounded-3xl p-2.5 sm:p-3", state?.status === "active" && "ninja-aura")}
      style={{ background: "var(--ninja-ink)" }}
    >
      <Image
        src="/games/ninja/board.webp"
        alt=""
        fill
        sizes="(min-width: 640px) 560px, 100vw"
        priority
        className="pointer-events-none -z-10 object-cover opacity-60"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0e1424]/30 via-transparent to-[#0e1424]/80" aria-hidden="true" />

      <div
        key={dealKey}
        className={cn("ninja-deal grid gap-2 sm:gap-2.5", tsukuyomi && "ninja-tsukuyomi-world")}
        style={{ gridTemplateColumns: `repeat(${NINJA_SIZE}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Поле свитков"
      >
        {Array.from({ length: NINJA_CELLS }, (_, cell) => {
          const kind = tileKind(state, trapCells, cell)
          const open = kind !== "closed"
          const pickIndex = picks.indexOf(cell)
          const canTap = pickMode ? !disabled : !disabled && !open && state?.status === "active"
          return (
            <button
              key={cell}
              ref={(el) => {
                tileRefs.current[cell] = el
              }}
              type="button"
              role="gridcell"
              disabled={!canTap}
              onClick={() => (pickMode ? onTogglePick(cell) : onOpen(cell))}
              aria-label={labelFor(kind, cell, pickIndex)}
              style={{ ["--deal" as string]: `${(Math.floor(cell / NINJA_SIZE) + (cell % NINJA_SIZE)) * 45}ms` }}
              className={cn(
                "ninja-tile group relative aspect-square rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--ninja-gold)]",
                open && "is-open",
                hit?.cell === cell && "is-hit",
                canTap && "cursor-pointer",
              )}
            >
              <span className="ninja-tile-inner block rounded-xl">
                <span
                  className={cn(
                    "ninja-face ninja-idle flex items-center justify-center bg-[var(--ninja-ink-2)] ring-1 ring-white/10 transition-colors",
                    canTap && !pickMode && "group-hover:ring-[var(--ninja-gold)]/70 group-active:scale-95",
                    pickMode && pickIndex >= 0 && "ring-2 ring-[var(--ninja-gold)]",
                  )}
                  style={{ ["--d" as string]: `${(cell % 7) * 180}ms` }}
                >
                  <Image src="/games/ninja/scroll.webp" alt="" width={96} height={96} sizes="(min-width: 640px) 96px, 18vw" className="size-[112%] max-w-none object-cover" />
                  {pickMode && pickIndex >= 0 && (
                    <span className="ninja-pick absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-[var(--ninja-gold)] font-display text-[10px] font-black text-[var(--ninja-ink)]">
                      {pickIndex + 1}
                    </span>
                  )}
                </span>
                {open && (
                  <span
                    className={cn(
                      "ninja-face ninja-face-back flex items-center justify-center bg-[var(--ninja-ink-2)] ring-1",
                      kind === "safe" && "ninja-glow-chakra ring-[var(--ninja-chakra)]/60",
                      kind === "sharingan" && "ninja-glow-red ring-[var(--ninja-red)]/70",
                      kind === "sealed" && "ring-[var(--ninja-red)]/60 opacity-80",
                      kind === "trap" && "ring-white/10 opacity-60 grayscale",
                      kind === "bust" && "ninja-glow-red ring-[var(--ninja-red)]",
                    )}
                  >
                    <Image src={ART[kind]} alt="" width={96} height={96} sizes="(min-width: 640px) 96px, 18vw" className="size-[112%] max-w-none object-cover" />
                    {kind === "sealed" && (
                      <span className="absolute inset-x-0 bottom-0 bg-[var(--ninja-red)]/90 py-0.5 text-center text-[8px] font-black uppercase tracking-wider text-white">
                        запечатано
                      </span>
                    )}
                  </span>
                )}
              </span>
              {hit?.cell === cell && <span key={hit.key} className="ninja-smoke" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <div ref={kunaiRef} className="pointer-events-none absolute left-0 top-0 z-20 -ml-3 -mt-6 opacity-0 will-change-transform" aria-hidden="true">
        <Kunai />
      </div>

      {burstKey > 0 && (
        <div key={burstKey} className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
          {BURST.map((b, i) => (
            <span key={i} className="ninja-burst" style={{ ["--a" as string]: b.angle, ["--r" as string]: b.radius, ["--bd" as string]: b.delay }} />
          ))}
        </div>
      )}

      {tsukuyomi && (
        <div className="ninja-tsukuyomi-veil z-30 flex items-center justify-center" aria-hidden="true">
          <Image src="/games/ninja/sharingan.webp" alt="" width={160} height={160} className="ninja-tsukuyomi-eye size-28 rounded-full sm:size-40" />
        </div>
      )}

      {rankUp && rank && (
        <div key={rankUp.key} className="pointer-events-none absolute inset-x-4 top-1/2 z-30 -translate-y-1/2" aria-live="polite">
          <div className="ninja-rankup mx-auto flex max-w-xs flex-col items-center gap-1 rounded-2xl bg-[var(--ninja-ink)]/90 px-5 py-4 text-center ring-2 ring-[var(--ninja-gold)] backdrop-blur">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--ninja-gold)]">Новый ранг</span>
            <span className="font-display text-2xl font-black text-white">{rank.label}</span>
            <span className="text-xs font-bold text-white/80">
              Закреплено {formatNinjaMultiplier(rankUp.refund)} даже при провале
            </span>
          </div>
        </div>
      )}
    </div>
  )
})

function labelFor(kind: TileKind, cell: number, pickIndex: number) {
  const pos = `ряд ${Math.floor(cell / NINJA_SIZE) + 1}, колонка ${(cell % NINJA_SIZE) + 1}`
  if (pickIndex >= 0) return `Свиток ${pos}, выбран ${pickIndex + 1}-м`
  switch (kind) {
    case "closed":
      return `Закрытый свиток, ${pos}`
    case "safe":
      return `Чакра, ${pos}`
    case "sharingan":
      return `Шаринган, ${pos}`
    case "sealed":
      return `Запечатанная ловушка, ${pos}`
    case "trap":
      return `Ловушка, ${pos}`
    case "bust":
      return `Сработавшая ловушка, ${pos}`
  }
}

function Kunai() {
  return (
    <svg viewBox="0 0 24 48" width="24" height="48" fill="none" aria-hidden="true">
      <path d="M12 1 L19 22 L12 27 L5 22 Z" fill="#cfd6e4" stroke="#1b2233" strokeWidth="1" />
      <path d="M12 1 L12 27" stroke="#8f98a8" strokeWidth="1" />
      <rect x="10" y="27" width="4" height="12" rx="1" fill="#2b2f3a" />
      <path d="M9 30h6M9 33h6M9 36h6" stroke="#f3e7c9" strokeWidth="0.8" strokeOpacity="0.7" />
      <circle cx="12" cy="43" r="4" stroke="#2b2f3a" strokeWidth="2" />
    </svg>
  )
}
