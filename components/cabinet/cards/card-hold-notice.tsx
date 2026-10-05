"use client"

import { useEffect, useRef } from "react"

export function CardHoldNotice({ requestNo, onContinue }: { requestNo: string | null; onContinue: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    buttonRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="card-hold-title"
        aria-describedby="card-hold-text"
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-card p-6 text-card-foreground shadow-xl ring-1 ring-border"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M3 10h18M7 15h3" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h2 id="card-hold-title" className="font-display text-lg font-bold text-balance">Проверка карты</h2>
          <p id="card-hold-text" className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Для проверки карты банк временно удержит небольшую сумму. Она сразу вернётся обратно на вашу карту — это не списание.
          </p>
          {requestNo && <p className="font-mono text-xs text-muted-foreground">Заявка № {requestNo}</p>}
        </div>
        <button
          ref={buttonRef}
          type="button"
          onClick={onContinue}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Понятно, продолжить
        </button>
      </div>
    </div>
  )
}
