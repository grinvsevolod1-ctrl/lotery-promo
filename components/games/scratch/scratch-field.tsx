"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const BRUSH = 22
const REVEAL_AT = 0.5

/**
 * One scratchable field: a foil canvas over the content. Dragging erases the
 * foil; once half of it is gone (or `revealed` is forced) the foil fades out.
 */
export function ScratchField({
  children,
  revealed,
  onReveal,
  disabled,
  label,
  highlight,
}: {
  children: ReactNode
  revealed: boolean
  onReveal: () => void
  disabled?: boolean
  label: string
  highlight?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const moves = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    const w = rect.width
    const h = rect.height
    const foil = ctx.createLinearGradient(0, 0, w, h)
    foil.addColorStop(0, "#d9dde3")
    foil.addColorStop(0.45, "#f4f6f8")
    foil.addColorStop(0.55, "#c4c9d1")
    foil.addColorStop(1, "#e6e9ed")
    ctx.fillStyle = foil
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = "rgba(22,26,34,0.06)"
    for (let i = 0; i < 70; i++) {
      ctx.beginPath()
      ctx.arc((i * 37) % w, (i * 53) % h, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = "rgba(22,26,34,0.45)"
    ctx.font = `800 ${Math.max(10, w * 0.12)}px Montserrat, system-ui, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("СОТРИ", w / 2, h / 2)
  }, [])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const clearedShare = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return 0
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let clear = 0
    let total = 0
    for (let i = 3; i < data.length; i += 4 * 24) {
      total++
      if (data[i] === 0) clear++
    }
    return total ? clear / total : 0
  }

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const p = point(e)
    ctx.globalCompositeOperation = "destination-out"
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = BRUSH * 2
    ctx.beginPath()
    const from = last.current ?? p
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    if (++moves.current % 6 === 0 && clearedShare(canvas) >= REVEAL_AT) onReveal()
  }

  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-[#fff7ed] to-[#ffe8d6] ring-1 ring-border transition-shadow duration-500",
        highlight && "animate-win-glow ring-2 ring-primary",
      )}
    >
      <div className="absolute inset-0 grid place-items-center p-[14%]">{children}</div>
      <canvas
        ref={canvasRef}
        role="button"
        tabIndex={revealed || disabled ? -1 : 0}
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onReveal()
          }
        }}
        onPointerDown={(e) => {
          if (disabled || revealed) return
          drawing.current = true
          last.current = null
          e.currentTarget.setPointerCapture(e.pointerId)
          scratch(e)
        }}
        onPointerMove={(e) => drawing.current && !disabled && !revealed && scratch(e)}
        onPointerUp={() => {
          drawing.current = false
          last.current = null
        }}
        onPointerCancel={() => (drawing.current = false)}
        className={cn(
          "absolute inset-0 size-full touch-none transition-opacity duration-500",
          revealed ? "pointer-events-none opacity-0" : disabled ? "cursor-not-allowed" : "cursor-grab",
        )}
      />
    </div>
  )
}
