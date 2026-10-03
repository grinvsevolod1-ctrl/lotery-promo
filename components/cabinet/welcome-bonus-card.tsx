"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CoinMark } from "@/components/icons"
import { Notice } from "@/components/cabinet/panel"
import { claimWelcomeBonus } from "@/app/actions/cabinet"
import { WELCOME_BONUS } from "@/lib/lottery"

export function WelcomeBonusCard() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const claim = () =>
    startTransition(async () => {
      setError(null)
      const res = await claimWelcomeBonus()
      if (!res.ok) setError(res.error)
      else router.refresh()
    })

  return (
    <div className="orbit-border rounded-3xl">
      <div className="grain relative flex flex-col items-start justify-between gap-4 rounded-3xl border border-gold/40 bg-card/80 p-6 backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
            <CoinMark className="size-6" />
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold text-foreground">Приветственный бонус</h2>
            <p className="text-sm text-muted-foreground">Получите {WELCOME_BONUS} BYN на первые билеты</p>
            {error && <div className="mt-2"><Notice tone="error">{error}</Notice></div>}
          </div>
        </div>
        <Button onClick={claim} disabled={isPending} size="lg" className="cta-shine w-full font-bold sm:w-auto">
          {isPending ? "Начисляем..." : `Получить ${WELCOME_BONUS} BYN`}
        </Button>
      </div>
    </div>
  )
}
