"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react"
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
export function NinjaShell({ balance, children }: { balance: number; children: ReactNode }) {
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

      <header className="flex shrink-0 items-center justify-between gap-3 px-3 pb-2 pt-[max(env(safe-area-inset-top),12px)] sm:px-5">
        <Link
          href="/play"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-3.5 text-sm font-bold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 active:scale-95"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Все игры</span>
          <span className="sr-only sm:hidden">Все игры</span>
        </Link>
        <h1 className="min-w-0 truncate font-display text-base font-black uppercase tracking-[0.18em] text-[var(--ninja-gold)]">{NINJA_GAME_NAME}</h1>
        <div className="flex items-center gap-2">
          <p className="rounded-full bg-white/10 px-3.5 py-2 font-display text-sm font-extrabold tabular-nums ring-1 ring-white/15 backdrop-blur" aria-live="polite">
            {formatMoney(balance)} <span className="text-[11px] font-bold text-white/70">BYN</span>
          </p>
          {supported && (
            <button
              type="button"
              onClick={toggle}
              aria-label={native ? "Выйти из полноэкранного режима" : "На весь экран"}
              className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 active:scale-95"
            >
              {native ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
            </button>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(env(safe-area-inset-bottom),20px)] sm:px-5">
        <div className="mx-auto w-full max-w-xl">{children}</div>
      </main>
    </div>
  )
}
