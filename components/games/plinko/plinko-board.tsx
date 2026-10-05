"use client"

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react"
import { formatMultiplier } from "@/lib/games/plinko"
import { cn } from "@/lib/utils"

export type PlinkoBoardHandle = {
  /** Animates a ball along a server-decided path; resolves when it lands. */
  drop: (path: number[]) => Promise<number>
}

type Ball = { path: number[]; slot: number; start: number; resolve: (slot: number) => void }

const SEGMENT_MS = 140
const PEG_COLOR = "rgba(22, 26, 34, 0.22)"
const PEG_HIT = "#ff6416"
const BALL_COLOR = "#ff6416"

export function slotTone(multiplier: number) {
  if (multiplier < 1) return { ring: "border-[#a8a29e]", text: "text-muted-foreground" }
  if (multiplier < 1.1) return { ring: "border-[#ff7a00]", text: "text-foreground/70" }
  if (multiplier < 2) return { ring: "border-[#4fd1dc]", text: "text-foreground/70" }
  if (multiplier < 5) return { ring: "border-[#7ed957]", text: "text-foreground/70" }
  return { ring: "border-[#e95ad8]", text: "text-foreground" }
}

/** Narrow slots (many rows on a phone) drop the "x" and shorten 1000 to 1K so labels never overlap. */
function slotLabel(m: number, spacing: number) {
  if (spacing >= 34) return formatMultiplier(m)
  if (m >= 1000) return `${Math.round(m / 1000)}K`
  return m >= 100 ? String(Math.round(m)) : String(m).replace(".", ",")
}

export function PlinkoBoard({
  rows,
  multipliers,
  ref,
}: {
  rows: number
  multipliers: readonly number[]
  ref?: Ref<PlinkoBoardHandle>
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ballsRef = useRef<Ball[]>([])
  const pegHitsRef = useRef<Map<string, number>>(new Map())
  const rafRef = useRef(0)
  const kickRef = useRef<() => void>(() => {})
  const [width, setWidth] = useState(0)
  const [hits, setHits] = useState<{ slot: number; key: number }[]>([])

  const spacing = width / (rows + 3)
  const rowGap = spacing * 0.86
  const pegRadius = Math.max(2.5, spacing * 0.09)
  const ballRadius = Math.max(4, spacing * 0.2)
  const top = ballRadius * 3
  const height = top + (rows - 1) * rowGap + pegRadius + 6

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const cx = width / 2
    const pegY = (i: number) => top + i * rowGap
    const restY = (i: number) => pegY(i) - pegRadius - ballRadius
    const ballX = (i: number, rights: number) => cx + (rights - i / 2) * spacing

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < i + 3; j++) {
          const hitAt = pegHitsRef.current.get(`${i}:${j}`) ?? -1e9
          const glow = Math.max(0, 1 - (now - hitAt) / 300)
          const x = cx + (j - (i + 2) / 2) * spacing
          if (glow > 0) {
            ctx.beginPath()
            ctx.fillStyle = `rgba(255, 100, 22, ${0.25 * glow})`
            ctx.arc(x, pegY(i), pegRadius * (2 + glow * 1.5), 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.beginPath()
          ctx.fillStyle = glow > 0 ? PEG_HIT : PEG_COLOR
          ctx.arc(x, pegY(i), pegRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      const alive: Ball[] = []
      for (const ball of ballsRef.current) {
        const elapsed = now - ball.start
        // Segment 0 drops from above onto the first peg; segment s>0 goes from row s-1 to row s (or the slot).
        const segment = Math.floor(elapsed / SEGMENT_MS)
        const t = Math.min(1, (elapsed % SEGMENT_MS) / SEGMENT_MS)
        if (segment > rows) {
          ball.resolve(ball.slot)
          continue
        }
        alive.push(ball)

        let x: number
        let y: number
        if (segment === 0) {
          x = cx
          y = -ballRadius + (restY(0) + ballRadius) * t * t
        } else {
          const from = segment - 1
          const rightsBefore = ball.path.slice(0, from).reduce((a, b) => a + b, 0)
          const rightsAfter = rightsBefore + ball.path[from]
          const x0 = ballX(from, rightsBefore)
          const x1 = ballX(from + 1, rightsAfter)
          const y0 = restY(from)
          const y1 = segment === rows ? height + ballRadius : restY(from + 1)
          const hop = rowGap * 0.45
          x = x0 + (x1 - x0) * t
          y = y0 + (y1 - y0) * t * t - hop * 4 * t * (1 - t)
          if (t < 0.12) pegHitsRef.current.set(`${from}:${rightsBefore + 1}`, now)
        }

        ctx.beginPath()
        ctx.fillStyle = "rgba(255, 100, 22, 0.18)"
        ctx.arc(x, y, ballRadius * 1.7, 0, Math.PI * 2)
        ctx.fill()
        const gradient = ctx.createRadialGradient(x - ballRadius / 3, y - ballRadius / 3, ballRadius / 5, x, y, ballRadius)
        gradient.addColorStop(0, "#ffd0a8")
        gradient.addColorStop(1, BALL_COLOR)
        ctx.beginPath()
        ctx.fillStyle = gradient
        ctx.arc(x, y, ballRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      ballsRef.current = alive

      const glowing = [...pegHitsRef.current.values()].some((at) => now - at < 300)
      rafRef.current = alive.length > 0 || glowing ? requestAnimationFrame(draw) : 0
    }

    draw(performance.now())
    const kick = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(draw)
    }
    kickRef.current = kick
    return () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [width, height, rows, spacing, rowGap, pegRadius, ballRadius, top])

  useImperativeHandle(
    ref,
    () => ({
      drop: (path) =>
        new Promise<number>((resolve) => {
          const slot = path.reduce((a, b) => a + b, 0)
          ballsRef.current.push({
            path,
            slot,
            start: performance.now(),
            resolve: (landed) => {
              setHits((prev) => [...prev.slice(-12), { slot: landed, key: Math.random() }])
              resolve(landed)
            },
          })
          kickRef.current()
        }),
    }),
    [],
  )

  const lastHit = hits.at(-1)

  return (
    <div ref={wrapRef} className="w-full select-none">
      <canvas ref={canvasRef} aria-hidden="true" style={{ width: "100%", height }} className="block" />
      <ul className="flex justify-center" aria-label="Множители лунок">
        {multipliers.map((m, i) => {
          const tone = slotTone(m)
          const active = lastHit?.slot === i
          return (
            <li
              key={`${rows}-${i}`}
              className="flex flex-col items-center"
              style={{ width: spacing || `${100 / (rows + 3)}%` }}
            >
              <span
                key={active ? lastHit?.key : undefined}
                className={cn(
                  "block aspect-[2/1] w-[82%] rounded-b-full border-[clamp(3px,1.2vw,6px)] border-t-0",
                  tone.ring,
                  active && "animate-slot-hit",
                )}
              />
              <span
                className={cn(
                  "mt-1 block w-full overflow-hidden text-center whitespace-nowrap font-display font-extrabold tabular-nums leading-none tracking-tighter",
                  tone.text,
                )}
                style={{ fontSize: spacing ? Math.min(14, Math.max(7, spacing * 0.4)) : undefined }}
                aria-label={formatMultiplier(m)}
              >
                {slotLabel(m, spacing)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
