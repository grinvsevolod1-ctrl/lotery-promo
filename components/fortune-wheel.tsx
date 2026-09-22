'use client'

import { useRef, useState } from 'react'
import { Reveal } from '@/components/reveal'
import { Confetti } from '@/components/confetti'

type Segment = {
  label: string
  fill: string
  text: string
}

const SEGMENTS: Segment[] = [
  { label: '+5 BYN', fill: 'oklch(0.45 0.22 305)', text: 'oklch(0.98 0 0)' },
  { label: '2 билета', fill: 'oklch(0.82 0.17 85)', text: 'oklch(0.2 0.05 300)' },
  { label: '+10 BYN', fill: 'oklch(0.62 0.26 350)', text: 'oklch(0.98 0 0)' },
  { label: 'Спин x2', fill: 'oklch(0.38 0.2 300)', text: 'oklch(0.98 0 0)' },
  { label: '+25 BYN', fill: 'oklch(0.82 0.17 85)', text: 'oklch(0.2 0.05 300)' },
  { label: 'Джекпот', fill: 'oklch(0.62 0.26 350)', text: 'oklch(0.98 0 0)' },
  { label: '+50 BYN', fill: 'oklch(0.45 0.22 305)', text: 'oklch(0.98 0 0)' },
  { label: '1 билет', fill: 'oklch(0.82 0.17 85)', text: 'oklch(0.2 0.05 300)' },
]

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = CENTER - 8
const SEG_ANGLE = 360 / SEGMENTS.length

function polar(angleDeg: number, r: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) }
}

function segmentPath(i: number) {
  const start = i * SEG_ANGLE
  const end = start + SEG_ANGLE
  const p1 = polar(start, RADIUS)
  const p2 = polar(end, RADIUS)
  return `M ${CENTER} ${CENTER} L ${p1.x} ${p1.y} A ${RADIUS} ${RADIUS} 0 0 1 ${p2.x} ${p2.y} Z`
}

export function FortuneWheel() {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [confettiKey, setConfettiKey] = useState(0)
  const spinsRef = useRef(0)

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    const winner = Math.floor(Math.random() * SEGMENTS.length)
    spinsRef.current += 1
    const fullTurns = 5 + spinsRef.current
    // pointer sits at top (0deg). Center of winning segment must land there.
    const target = 360 - (winner * SEG_ANGLE + SEG_ANGLE / 2)
    const next = fullTurns * 360 + target
    // keep absolute rotation growing so it always spins forward
    const base = Math.ceil(rotation / 360) * 360
    setRotation(base + next)

    window.setTimeout(() => {
      setSpinning(false)
      setResult(SEGMENTS[winner].label)
      // celebrate every prize with a burst; the wheel has no "lose" segment
      setConfettiKey((k) => k + 1)
    }, 4200)
  }

  return (
    <section id="wheel" className="relative py-16 md:py-24">
      <Confetti fireKey={confettiKey} />
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            Крути колесо фортуны
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center text-sm font-medium text-muted-foreground">
            Испытай удачу прямо сейчас — один бесплатный спин для каждого нового игрока.
          </p>
        </Reveal>

        <Reveal className="mt-12 flex flex-col items-center gap-8">
          <div className="relative" style={{ width: SIZE, maxWidth: '90vw' }}>
            {/* pointer */}
            <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
              <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true">
                <path
                  d="M17 40 L2 8 A17 12 0 0 1 32 8 Z"
                  fill="oklch(0.82 0.17 85)"
                  stroke="oklch(0.2 0.05 300)"
                  strokeWidth="2"
                />
                <circle cx="17" cy="10" r="4" fill="oklch(0.2 0.05 300)" />
              </svg>
            </div>

            <div
              className="rounded-full p-2"
              style={{
                background:
                  'conic-gradient(from 0deg, oklch(0.82 0.17 85), oklch(0.62 0.26 350), oklch(0.45 0.22 305), oklch(0.82 0.17 85))',
                boxShadow:
                  '0 0 60px -10px oklch(0.62 0.26 350 / 0.7), inset 0 0 0 4px oklch(0.2 0.05 300)',
              }}
            >
              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="block w-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? 'transform 4.1s cubic-bezier(0.16, 1, 0.3, 1)'
                    : 'none',
                }}
                role="img"
                aria-label="Колесо фортуны с призами"
              >
                {SEGMENTS.map((seg, i) => {
                  const mid = i * SEG_ANGLE + SEG_ANGLE / 2
                  const labelPos = polar(mid, RADIUS * 0.62)
                  return (
                    <g key={seg.label}>
                      <path d={segmentPath(i)} fill={seg.fill} stroke="oklch(0.2 0.05 300)" strokeWidth="2" />
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        fill={seg.text}
                        fontSize="15"
                        fontWeight="800"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
                      >
                        {seg.label}
                      </text>
                    </g>
                  )
                })}
                <circle cx={CENTER} cy={CENTER} r="26" fill="oklch(0.2 0.05 300)" />
                <circle cx={CENTER} cy={CENTER} r="26" fill="none" stroke="oklch(0.82 0.17 85)" strokeWidth="3" />
              </svg>
            </div>
          </div>

          <div className="flex min-h-[2rem] items-center">
            {result ? (
              <p className="font-display text-xl font-extrabold text-shimmer" role="status">
                Выпало: {result}!
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
                {spinning ? 'Крутим…' : 'Нажми на кнопку и лови удачу'}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className="h-14 rounded-full bg-accent px-12 font-heading text-base font-bold uppercase tracking-wide text-accent-foreground shadow-xl shadow-accent/40 transition-transform hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {spinning ? 'Крутится…' : 'Крутить'}
          </button>
        </Reveal>
      </div>
    </section>
  )
}
