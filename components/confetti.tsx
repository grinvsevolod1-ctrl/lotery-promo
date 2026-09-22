'use client'

import { useEffect, useRef } from 'react'

type Piece = {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  color: string
  shape: 'rect' | 'circle'
}

const COLORS = ['#c084fc', '#f472b6', '#fbbf24', '#a855f7', '#fde68a', '#ec4899']

/*
 * Authorial canvas confetti burst — fires once per `fireKey` change.
 * No third-party library; physics + fade are hand-rolled.
 */
export function Confetti({ fireKey }: { fireKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (fireKey === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = (canvas.width = window.innerWidth * dpr)
    const h = (canvas.height = window.innerHeight * dpr)
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`

    const cx = w / 2
    const cy = h * 0.32
    const pieces: Piece[] = Array.from({ length: 160 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = (6 + Math.random() * 10) * dpr
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6 * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        size: (5 + Math.random() * 7) * dpr,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      }
    })

    let frame = 0
    let raf = 0
    const gravity = 0.35 * dpr
    const maxFrames = 160

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      frame++
      const fade = Math.max(0, 1 - frame / maxFrames)
      for (const p of pieces) {
        p.vy += gravity
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.globalAlpha = fade
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      if (frame < maxFrames) {
        raf = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, w, h)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fireKey])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  )
}
