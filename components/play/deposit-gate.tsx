"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { track } from "@/lib/analytics"
import type { ShowcaseGame } from "@/lib/games/showcase"

type Gate = { open: (game: ShowcaseGame) => void }

const GateContext = createContext<Gate | null>(null)

export function useDepositGate() {
  const ctx = useContext(GateContext)
  if (!ctx) throw new Error("useDepositGate must be used inside DepositGateProvider")
  return ctx
}

export function DepositGateProvider({ children, guest = false }: { children: React.ReactNode; guest?: boolean }) {
  const [game, setGame] = useState<ShowcaseGame | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()

  const open = useCallback(
    (next: ShowcaseGame) => {
      if (guest) {
        track("guest_game_click", { game: next.id })
        router.push(`/sign-up?from=${encodeURIComponent(next.id)}`)
        return
      }
      track("game_open", { game: next.id })
      setGame(next)
    },
    [guest, router],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (game && !dialog.open) dialog.showModal()
    if (!game && dialog.open) dialog.close()
  }, [game])

  const name = game ? [game.kicker, game.title, game.subtitle].filter(Boolean).join(" ") : ""

  return (
    <GateContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        onClose={() => setGame(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setGame(null)
        }}
        aria-labelledby="deposit-gate-title"
        className="m-auto w-[min(92vw,380px)] overflow-hidden rounded-3xl bg-card p-0 text-foreground shadow-2xl ring-1 ring-border backdrop:bg-foreground/60 backdrop:backdrop-blur-sm"
      >
        {game && (
          <div className="flex flex-col">
            <div className="relative h-40 w-full" style={{ backgroundColor: game.tint }}>
              <Image src={game.cover} alt="" fill sizes="380px" className="object-cover object-top" />
              <span
                className="absolute inset-0"
                style={{ backgroundImage: `linear-gradient(to top, ${game.tint}, transparent 70%)` }}
                aria-hidden="true"
              />
              <span className="absolute bottom-3 left-4 flex flex-col text-background">
                <span className="font-display text-xl font-black uppercase leading-none drop-shadow">{name}</span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-85">{game.provider}</span>
              </span>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <div>
                  <h2 id="deposit-gate-title" className="font-display text-lg font-extrabold text-balance">
                    Доступно после пополнения
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                    Слоты и live-игры открываются после пополнения баланса. Пополнить можно криптовалютой — зачисление в BYN по текущему курсу.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGame(null)}
                  className="flex-1 rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground transition hover:brightness-110"
                >
                  Закрыть
                </button>
                <Link
                  href="/cabinet/deposit/crypto"
                  className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-extrabold text-primary-foreground transition hover:brightness-110"
                >
                  Пополнить
                </Link>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </GateContext.Provider>
  )
}
