'use client'

import { useEffect, useState } from 'react'
import { NUMBERS_PER_TICKET, PRIZE_BY_MATCHES } from '@/lib/lottery'

const TOP_PRIZE = PRIZE_BY_MATCHES[NUMBERS_PER_TICKET]

/** Counts up to the real top prize of a draw (6 matched numbers). */
export function JackpotCounter() {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const duration = 1400
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      setValue(Math.floor(eased * TOP_PRIZE))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-gold/90">
        Главный приз тиража
      </span>
      <span className="font-display text-4xl font-extrabold tabular-nums text-shimmer sm:text-5xl md:text-6xl">
        {value.toLocaleString('ru-RU')}
      </span>
      <span className="text-sm font-bold uppercase tracking-widest text-foreground/80">
        бонусных BYN за {NUMBERS_PER_TICKET} из {NUMBERS_PER_TICKET}
      </span>
    </div>
  )
}
