"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { BadgeCheck, Wallet, Zap, X } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { WELCOME_BONUS } from "@/lib/lottery"
import { track } from "@/lib/analytics"

const DISMISSED_KEY = "welcome-promo-dismissed"
const SHOW_DELAY_MS = 1200

const PERKS = [
  { icon: Zap, text: "Зачисляем сразу после регистрации" },
  { icon: Wallet, text: "Можно вывести — это реальные деньги" },
  { icon: BadgeCheck, text: "Без пополнения и привязки карты" },
]

export function WelcomePromo() {
  const { data: session, isPending } = useSession()
  const [open, setOpen] = useState(false)
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const isGuest = !isPending && !session?.user

  useEffect(() => {
    if (!isGuest) return
    let dismissed = false
    try {
      dismissed = window.sessionStorage.getItem(DISMISSED_KEY) === "1"
    } catch {}
    if (dismissed) return
    const timer = window.setTimeout(() => {
      setOpen(true)
      track("promo_view")
    }, SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [isGuest])

  const close = useCallback((reason: "dismiss" | "signup") => {
    setOpen(false)
    if (reason === "dismiss") track("promo_dismiss")
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1")
    } catch {}
  }, [])

  useEffect(() => {
    if (!open) return
    ctaRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close("dismiss")
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-promo-title"
      className="fixed inset-0 z-50 flex animate-in fade-in items-stretch justify-center bg-foreground/70 backdrop-blur-md duration-300 sm:items-center sm:p-6"
    >
      <div className="relative isolate flex w-full max-w-md animate-in slide-in-from-bottom-8 flex-col overflow-hidden bg-[#0d1220] text-background duration-500 sm:max-h-[92dvh] sm:rounded-[2rem] sm:zoom-in-95">
        <div className="relative min-h-0 flex-1">
          <Image
            src="/landing/welcome-modal.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 640px) 448px, 100vw"
            className="object-cover object-top"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-[#0d1220] via-[#0d1220]/20 to-transparent" aria-hidden="true" />
          <button
            type="button"
            onClick={() => close("dismiss")}
            aria-label="Закрыть"
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid size-10 place-items-center rounded-full bg-background/15 text-background backdrop-blur-md transition hover:bg-background/25"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <span className="absolute left-5 top-[max(1.25rem,env(safe-area-inset-top))] rounded-full bg-primary px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-primary-foreground">
            Только для новых игроков
          </span>
        </div>

        <div className="relative -mt-24 flex flex-col gap-5 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div>
            <p className="font-display text-sm font-extrabold uppercase tracking-widest text-primary">Подарок за регистрацию</p>
            <h2 id="welcome-promo-title" className="mt-1 font-display font-black leading-none">
              <span className="block text-7xl tracking-tight sm:text-8xl">
                {WELCOME_BONUS}
                <span className="ml-2 align-top text-2xl text-primary">BYN</span>
              </span>
              <span className="mt-2 block text-2xl text-balance">бесплатно на баланс</span>
            </h2>
          </div>

          <ul className="flex flex-col gap-2.5">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-semibold text-background/90">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Link
              ref={ctaRef}
              href="/sign-up?from=promo"
              onClick={() => {
                track("promo_signup_click")
                close("signup")
              }}
              className="flex h-14 items-center justify-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-[0_10px_40px_-8px] shadow-primary transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
            >
              Забрать {WELCOME_BONUS} BYN
            </Link>
            <Link
              href="/sign-in"
              onClick={() => close("signup")}
              className="flex h-11 items-center justify-center rounded-2xl text-sm font-bold text-background/70 transition hover:text-background"
            >
              У меня уже есть аккаунт
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
