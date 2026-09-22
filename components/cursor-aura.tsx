'use client'

import { useEffect, useRef } from 'react'

export function CursorAura() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(pointer: coarse)').matches) {
      el.style.display = 'none'
      return
    }

    let raf = 0
    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 3
    let cx = tx
    let cy = ty

    const onMove = (e: MouseEvent) => {
      tx = e.clientX
      ty = e.clientY
    }

    const tick = () => {
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      el.style.setProperty('--mx', `${cx}px`)
      el.style.setProperty('--my', `${cy}px`)
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <div ref={ref} className="cursor-aura" aria-hidden="true" />
}
