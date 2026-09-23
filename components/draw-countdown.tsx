'use client'

import { useEffect, useState } from 'react'

/* Next draw fires daily at 20:00 local time. Returns ms until then. */
function msUntilNextDraw() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(20, 0, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now.getTime()
}

function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return { hours, minutes, seconds }
}

function Digit({ value, label }: { value: number; label: string }) {
  const text = String(value).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {text.split('').map((d, i) => (
          <span
            key={`${i}-${d}`}
            className="relative grid h-12 w-8 place-items-center overflow-hidden rounded-xl border border-gold/30 bg-[oklch(0.18_0.08_300)] font-display text-lg font-extrabold text-gold shadow-inner sm:h-16 sm:w-12 sm:text-3xl"
          >
            {/* subtle mid seam like a flip clock */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/40"
            />
            <span key={d} className="animate-flip-in">
              {d}
            </span>
          </span>
        ))}
      </div>
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function DrawCountdown() {
  const [ms, setMs] = useState<number | null>(null)

  useEffect(() => {
    setMs(msUntilNextDraw())
    const id = window.setInterval(() => setMs(msUntilNextDraw()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { hours, minutes, seconds } = split(ms ?? 0)

  return (
    <div className="inline-flex flex-col items-center gap-3 rounded-3xl border border-gold/25 bg-[oklch(0.2_0.09_300)]/70 px-4 py-4 backdrop-blur sm:px-6 sm:py-5 md:items-start">
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        До ближайшего тиража
      </span>
      <div
        className="flex items-end gap-1 sm:gap-2"
        role="timer"
        aria-label={`До розыгрыша ${hours} часов ${minutes} минут ${seconds} секунд`}
      >
        <Digit value={hours} label="часы" />
        <span className="pb-5 font-display text-lg font-extrabold text-gold/60 sm:pb-6 sm:text-2xl">:</span>
        <Digit value={minutes} label="минуты" />
        <span className="pb-5 font-display text-lg font-extrabold text-gold/60 sm:pb-6 sm:text-2xl">:</span>
        <Digit value={seconds} label="секунды" />
      </div>
    </div>
  )
}
