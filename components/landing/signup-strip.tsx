"use client"

import Link from "next/link"
import { ArrowRight, Gift } from "lucide-react"
import { track } from "@/lib/analytics"
import { WELCOME_BONUS } from "@/lib/lottery"

export function SignupStrip() {
  return (
    <Link
      href="/sign-up?from=strip"
      onClick={() => track("banner_click", { banner: "strip" })}
      className="group flex items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-foreground/20">
        <Gift className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-black leading-tight">Регистрация</span>
        <span className="block text-sm font-semibold opacity-90">
          +{WELCOME_BONUS} BYN на баланс сразу
        </span>
      </span>
      <ArrowRight className="size-6 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  )
}
