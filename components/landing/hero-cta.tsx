"use client"

import Link from "next/link"
import { useSession } from "@/lib/auth-client"
import { WELCOME_BONUS } from "@/lib/lottery"

export function HeroCta() {
  const { data: session } = useSession()
  const authed = Boolean(session?.user)
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        href={authed ? "/play" : "/sign-up"}
        className="animate-glow inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-8 text-base font-extrabold uppercase tracking-wide text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
      >
        {authed ? "Играть" : `Забрать ${WELCOME_BONUS} BYN`}
      </Link>
      <Link
        href="#catalog"
        className="inline-flex h-14 items-center justify-center rounded-2xl bg-background/10 px-6 text-sm font-bold text-background ring-1 ring-background/20 transition hover:bg-background/20"
      >
        Смотреть игры
      </Link>
    </div>
  )
}
