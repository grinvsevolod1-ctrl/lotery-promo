"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Lock } from "lucide-react"
import { claimBonus } from "@/app/actions/bonuses"
import { claimWelcomeBonus } from "@/app/actions/cabinet"
import type { BonusId, BonusState } from "@/lib/bonuses"
import { win } from "@/lib/feedback"
import { cn } from "@/lib/utils"

export type BonusCardInfo = { title: string; tag: string; description: string; image: string; lockedHref?: string }

export function BonusCard({ id, info, state, priority }: { id: BonusId; info: BonusCardInfo; state: BonusState; priority?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function claim() {
    setError(null)
    startTransition(async () => {
      const result = id === "welcome" ? await claimWelcomeBonus() : await claimBonus(id)
      if (result.ok) {
        win(10)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-3xl bg-foreground text-background ring-1 transition-shadow",
        state.status === "claimable" ? "ring-2 ring-primary shadow-xl shadow-primary/25" : "ring-foreground",
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <Image
          src={info.image}
          alt=""
          fill
          sizes="(min-width: 640px) 360px, 100vw"
          priority={priority}
          className={cn("object-cover", state.status === "claimed" && "opacity-50 grayscale")}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground to-transparent" aria-hidden />
        <span className="absolute left-3 top-3 rounded-full bg-foreground/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-background backdrop-blur">
          {info.tag}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-1">
        <h2 className="font-display text-xl font-extrabold text-balance">{info.title}</h2>
        <p className="text-sm leading-relaxed text-background/70 text-pretty">{info.description}</p>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {state.status === "claimable" && (
            <button
              type="button"
              onClick={claim}
              disabled={pending}
              className="h-12 rounded-2xl bg-primary text-base font-extrabold text-primary-foreground shadow-lg shadow-primary/40 transition active:scale-[0.97] disabled:opacity-60"
            >
              {pending ? "Зачисляем…" : `Забрать ${state.amount.toLocaleString("ru-RU")} BYN`}
            </button>
          )}

          {state.status === "claimed" && (
            <p className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-background/10 text-sm font-bold text-background/80">
              <Check className="size-4" strokeWidth={3} />
              {`Получено ${state.amount.toLocaleString("ru-RU")} BYN`}
              {state.until && <span className="font-medium text-background/50">{`· снова ${state.until}`}</span>}
            </p>
          )}

          {state.status === "locked" && (
            <>
              {state.progress && (
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-background/70 tabular-nums">
                    <span>Прогресс</span>
                    <span>{`${state.progress.current} / ${state.progress.target} BYN`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-background/10">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (state.progress.current / state.progress.target) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {info.lockedHref ? (
                <Link
                  href={info.lockedHref}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-background/10 text-sm font-bold text-background transition hover:bg-background/15"
                >
                  <Lock className="size-4" />
                  {state.hint}
                </Link>
              ) : (
                <p className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-background/10 px-3 text-center text-sm font-bold text-background/80">
                  <Lock className="size-4 shrink-0" />
                  {state.hint}
                </p>
              )}
            </>
          )}

          {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        </div>
      </div>
    </article>
  )
}
