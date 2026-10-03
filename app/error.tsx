"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WarnMark } from "@/components/icons"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-5 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-60" aria-hidden />
      <main className="relative flex max-w-md flex-col items-center">
        <span className="mb-6 grid size-16 place-items-center rounded-3xl bg-destructive/15 text-destructive ring-1 ring-destructive/40">
          <WarnMark className="size-8" />
        </span>
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Что-то пошло не так</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground text-balance">
          Барабан заклинило
        </h1>
        <p className="mt-4 text-muted-foreground text-pretty">
          Произошла ошибка при загрузке страницы. Попробуйте обновить её — если не поможет, напишите нам.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground/60">Код ошибки: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={reset} className="cta-shine h-12 rounded-full px-8 font-bold">
            Попробовать снова
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/" />}
            className="h-12 rounded-full border-gold/40 bg-transparent px-8 font-bold text-gold hover:bg-gold/10 hover:text-gold"
          >
            На главную
          </Button>
        </div>
      </main>
    </div>
  )
}
