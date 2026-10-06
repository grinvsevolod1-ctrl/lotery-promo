"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "@/lib/auth-client"
import { WELCOME_BONUS } from "@/lib/lottery"
import { CheckMark } from "@/components/icons"

const DISMISSED_KEY = "welcome-promo-dismissed"
const SHOW_DELAY_MS = 1500

const PERKS = ["Начисляется сразу после регистрации", "Подходит для всех игр", "Без пополнения и привязки карты"]

export function WelcomePromo() {
  const { data: session, isPending } = useSession()
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const isGuest = !isPending && !session?.user

  useEffect(() => {
    if (!isGuest) return
    let dismissed = false
    try {
      dismissed = window.sessionStorage.getItem(DISMISSED_KEY) === "1"
    } catch {}
    if (dismissed) return
    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [isGuest])

  const close = useCallback(() => {
    setOpen(false)
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1")
    } catch {}
  }, [])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [open, close])

  if (!open || !isGuest) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Закрыть"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 animate-in fade-in bg-black/60 backdrop-blur-sm duration-300"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-promo-title"
        className="relative isolate w-full max-w-md animate-in fade-in slide-in-from-bottom-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1f5be0] via-[#1a47c4] to-[#0f2c8f] p-6 text-white shadow-2xl duration-300 sm:zoom-in-95 sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 -z-10 size-56 rounded-full bg-primary/40 blur-3xl"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Закрыть"
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/15 text-lg leading-none text-white transition-colors hover:bg-white/25"
        >
          <span aria-hidden="true">×</span>
        </button>

        <p className="text-sm font-semibold text-white/80">Подарок новым игрокам</p>
        <h2
          id="welcome-promo-title"
          className="mt-2 font-display text-2xl font-black uppercase leading-tight tracking-tight text-balance sm:text-3xl"
        >
          Получи {WELCOME_BONUS} рублей за регистрацию
        </h2>

        <div className="mt-5 w-fit rounded-3xl bg-gradient-to-b from-[#ff8a3d] to-primary px-6 py-3 shadow-lg shadow-black/25 ring-4 ring-white/15">
          <p className="font-display text-5xl font-black leading-none tracking-tight">
            {WELCOME_BONUS}
            <span className="ml-2 align-top text-base font-extrabold uppercase">BYN</span>
          </p>
        </div>

        <ul className="mt-5 flex flex-col gap-2 text-sm text-white/90">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                <CheckMark className="size-3" />
              </span>
              {perk}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/sign-up"
            onClick={close}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-white px-7 text-sm font-extrabold uppercase tracking-wide text-primary shadow-lg shadow-black/20 transition-transform hover:scale-[1.03]"
          >
            Забрать бонус
          </Link>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-white/80 transition-colors hover:text-white"
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  )
}
