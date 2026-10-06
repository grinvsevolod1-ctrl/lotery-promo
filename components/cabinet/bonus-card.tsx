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
        "flex h-full flex-col overflow-hidden rounded-3xl bg-card text-foreground ring-1 transition-shadow",
        state.status === "claimable" ? "ring-primary/50 shadow-lg shadow-primary/10" : "ring-border",
      )}
    >
      <div className="relative m-2 mb-0 aspect-[16/9] overflow-hidden rounded-2xl">
        <Image
          src={info.image}
          alt=""
          fill
          sizes="(min-width: 640px) 360px, 100vw"
          priority={priority}
          className={cn("object-cover", state.status === "claimed" && "opacity-50 grayscale")}
        />
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-foreground backdrop-blur">
          {info.tag}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-4">
        <h2 className="font-display text-xl font-extrabold text-balance">{info.title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{info.description}</p>

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
            <p className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-bold text-foreground">
              <Check className="size-4" strokeWidth={3} />
              {`Получено ${state.amount.toLocaleString("ru-RU")} BYN`}
              {state.until && <span className="font-medium text-muted-foreground">{`· снова ${state.until}`}</span>}
            </p>
          )}

          {state.status === "locked" && (
            <>
              {state.progress && (
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted-foreground tabular-nums">
                    <span>Прогресс</span>
                    <span>{`${state.progress.current} / ${state.progress.target} BYN`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
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
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-bold text-foreground transition hover:bg-secondary/70"
                >
                  <Lock className="size-4" />
                  {state.hint}
                </Link>
              ) : (
                <p className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-center text-sm font-bold text-foreground">
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
