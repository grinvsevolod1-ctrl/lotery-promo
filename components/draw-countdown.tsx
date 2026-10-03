'use client'

import { useEffect, useState } from 'react'
import { nextDrawAt } from '@/lib/lottery'

function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return { hours, minutes, seconds }
}

function Digit({ value, label, compact }: { value: number; label: string; compact?: boolean }) {
  const text = String(value).padStart(2, '0')
  const box = compact
    ? 'h-11 w-9 text-xl'
    : 'h-14 w-11 text-2xl sm:h-16 sm:w-12 sm:text-3xl'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {text.split('').map((d, i) => (
          <span
            key={`${i}-${d}`}
            className={`relative grid place-items-center overflow-hidden rounded-xl border border-gold/30 bg-[oklch(0.18_0.08_300)] font-display font-extrabold text-gold shadow-inner ${box}`}
          >
            {/* subtle mid seam like a flip clock */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/40" />
            <span key={d} className="animate-flip-in">
              {d}
            </span>
          </span>
        ))}
      </div>
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  )
}

/**
 * Counts down to the next 20:00 Minsk draw. Pass `drawAt` (ISO) to count to a
 * specific scheduled draw; otherwise the next one is computed on the client.
 */
export function DrawCountdown({
  drawAt,
  compact,
  title = 'До ближайшего тиража',
  className = '',
}: {
  drawAt?: string
  compact?: boolean
  title?: string
  className?: string
}) {
  const [ms, setMs] = useState<number | null>(null)

  useEffect(() => {
    const target = () => (drawAt ? new Date(drawAt).getTime() : nextDrawAt().getTime())
    const update = () => setMs(target() - Date.now())
    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [drawAt])

  const { hours, minutes, seconds } = split(ms ?? 0)

  return (
    <div
      className={`inline-flex flex-col items-center gap-3 rounded-3xl border border-gold/25 bg-[oklch(0.2_0.09_300)]/70 px-6 py-5 backdrop-blur md:items-start ${className}`}
    >
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        {title}
      </span>
      <div
        className="flex items-end gap-2"
        role="timer"
        aria-label={`До розыгрыша ${hours} часов ${minutes} минут ${seconds} секунд`}
      >
        <Digit value={hours} label="часы" compact={compact} />
        <span className="pb-6 font-display text-2xl font-extrabold text-gold/60">:</span>
        <Digit value={minutes} label="минуты" compact={compact} />
        <span className="pb-6 font-display text-2xl font-extrabold text-gold/60">:</span>
        <Digit value={seconds} label="секунды" compact={compact} />
      </div>
    </div>
  )
}
