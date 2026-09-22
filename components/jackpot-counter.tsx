'use client'

import { useEffect, useState } from 'react'

export function JackpotCounter() {
  const target = 12480650
  const [value, setValue] = useState(0)

  useEffect(() => {
    const duration = 1800
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      setValue(Math.floor(eased * target))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const formatted = value.toLocaleString('ru-RU')

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-gold/90">
        Текущий джекпот
      </span>
      <span className="font-heading text-4xl font-extrabold tabular-nums text-shimmer sm:text-5xl md:text-6xl">
        {formatted}
      </span>
      <span className="text-sm font-bold uppercase tracking-widest text-foreground/80">
        BYN
      </span>
    </div>
  )
}
