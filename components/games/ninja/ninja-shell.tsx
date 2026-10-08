"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, Maximize2, Minimize2, SlidersHorizontal } from "lucide-react"
import { NINJA_GAME_NAME } from "@/lib/games/ninja"
import { cn } from "@/lib/utils"

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: 3 + (i % 3) * 2,
  delay: `${(i * 1.7) % 9}s`,
  duration: `${9 + (i % 4) * 2.5}s`,
  gold: i % 4 === 0,
}))

const formatMoney = (value: number) => value.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })

/**
 * Immersive stage: covers the whole viewport above the site chrome and, where
 * the browser allows it, switches to native fullscreen on the first tap.
 */
export function NinjaShell({
  balance,
  onSettings,
  settingsOpen,
  children,
}: {
  balance: number
  onSettings: () => void
  settingsOpen: boolean
  children: ReactNode
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const requested = useRef(false)
  const [native, setNative] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(typeof document !== "undefined" && !!document.fullscreenEnabled)
    const sync = () => setNative(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", sync)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("fullscreenchange", sync)
      document.body.style.overflow = prevOverflow
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  const enter = () => shellRef.current?.requestFullscreen({ navigationUI: "hide" }).catch(() => {})
  const toggle = () => (document.fullscreenElement ? document.exitFullscreen().catch(() => {}) : enter())

  // Fullscreen needs a user gesture: the first tap anywhere on the stage counts.
  const onFirstPointer = () => {
    if (requested.current || !supported || document.fullscreenElement) return
    requested.current = true
    enter()
  }

  return (
    <div
      ref={shellRef}
      onPointerDown={onFirstPointer}
      className="ninja ninja-shell fixed inset-0 z-[80] isolate flex flex-col overflow-hidden text-white"
      style={{ background: "var(--ninja-ink)" }}
    >
      <Image src="/games/ninja/board.webp" alt="" fill sizes="100vw" priority className="pointer-events-none -z-20 object-cover opacity-25 blur-sm" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[var(--ninja-ink)]/70 via-transparent to-[var(--ninja-ink)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className={cn("ninja-spark absolute rounded-full", s.gold ? "bg-[var(--ninja-gold)]" : "bg-[var(--ninja-chakra)]")}
            style={{ left: s.left, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration }}
          />
        ))}
      </div>

      <header className="flex shrink-0 items-center justify-between gap-2 px-2 pb-1.5 pt-[max(env(safe-area-inset-top),8px)] sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/play"
            aria-label="Все игры"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 active:scale-95"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
          <h1 className="min-w-0 truncate font-display text-sm font-black uppercase tracking-[0.18em] text-[var(--ninja-gold)]">{NINJA_GAME_NAME}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <p className="rounded-full bg-white/10 px-3 py-1.5 font-display text-sm font-extrabold tabular-nums ring-1 ring-white/15 backdrop-blur" aria-live="polite">
            {formatMoney(balance)} <span className="text-[10px] font-bold text-white/70">BYN</span>
          </p>
          <button
            type="button"
            onClick={onSettings}
            aria-label="Настройки игры"
            aria-expanded={settingsOpen}
            className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 active:scale-95"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </button>
          {supported && (
            <button
              type="button"
              onClick={toggle}
              aria-label={native ? "Выйти из полноэкранного режима" : "На весь экран"}
              className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 active:scale-95"
            >
              {native ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
            </button>
          )}
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-1 sm:px-4">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col">{children}</div>
      </main>
    </div>
  )
}
