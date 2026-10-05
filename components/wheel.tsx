'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

const INK = '#161a22'
const PALETTE = [
  { fill: '#ff6416', text: '#ffffff' },
  { fill: '#ffffff', text: INK },
  { fill: '#1f5be0', text: '#ffffff' },
  { fill: '#f3f4f6', text: INK },
]

export const SPIN_DURATION_MS = 4200

export type WheelHandle = {
  /** Spins forward and lands on the given segment; resolves when the wheel stops. */
  spinTo: (index: number) => Promise<void>
}

function polar(angleDeg: number, r: number, center: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) }
}

export const Wheel = forwardRef<
  WheelHandle,
  { labels: readonly string[]; size?: number; className?: string; initialIndex?: number | null }
>(function Wheel({ labels, size = 320, className, initialIndex = null }, ref) {
    const segAngle = 360 / labels.length
    const restingAngle = (index: number) => 360 - (index * segAngle + segAngle / 2)
    const initialRotation = initialIndex === null ? 0 : restingAngle(initialIndex)

    const [rotation, setRotation] = useState(initialRotation)
    const [spinning, setSpinning] = useState(false)
    const spinsRef = useRef(0)
    const rotationRef = useRef(initialRotation)

    const center = size / 2
    const radius = center - 8

    useImperativeHandle(ref, () => ({
      spinTo(index) {
        spinsRef.current += 1
        const fullTurns = 5 + Math.min(spinsRef.current, 3)
        // The pointer sits at the top (0deg): the centre of the winning segment must land there.
        const target = restingAngle(index)
        const base = Math.ceil(rotationRef.current / 360) * 360
        const next = base + fullTurns * 360 + target
        rotationRef.current = next
        setSpinning(true)
        setRotation(next)
        return new Promise<void>((resolve) => {
          window.setTimeout(() => {
            setSpinning(false)
            resolve()
          }, SPIN_DURATION_MS)
        })
      },
    }))

    const segmentPath = (i: number) => {
      const p1 = polar(i * segAngle, radius, center)
      const p2 = polar((i + 1) * segAngle, radius, center)
      return `M ${center} ${center} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 1 ${p2.x} ${p2.y} Z`
    }

    return (
      <div className={className} style={{ width: size, maxWidth: '100%' }}>
        <div className="relative">
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[40%] drop-shadow-[0_4px_8px_rgb(22_26_34/0.25)]">
            <svg width="30" height="36" viewBox="0 0 30 36" aria-hidden="true">
              <path d="M15 36 L3 9 A13 13 0 1 1 27 9 Z" fill={INK} />
              <circle cx="15" cy="12" r="4.5" fill="#ff6416" />
            </svg>
          </div>

          <div className="rounded-full bg-white p-2.5 shadow-[0_24px_60px_-20px_rgb(22_26_34/0.35),inset_0_0_0_1px_rgb(22_26_34/0.08)]">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="block w-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? `transform ${SPIN_DURATION_MS - 100}ms cubic-bezier(0.16, 1, 0.3, 1)` : 'none',
              }}
              role="img"
              aria-label="Колесо фортуны с призами"
            >
              {labels.map((label, i) => {
                const mid = i * segAngle + segAngle / 2
                const pos = polar(mid, radius * 0.62, center)
                const color = PALETTE[i % PALETTE.length]
                return (
                  <g key={`${label}-${i}`}>
                    <path d={segmentPath(i)} fill={color.fill} stroke="rgb(22 26 34 / 0.08)" strokeWidth="1" />
                    <text
                      x={pos.x}
                      y={pos.y}
                      fill={color.text}
                      fontSize={size * 0.047}
                      fontWeight="800"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${mid}, ${pos.x}, ${pos.y})`}
                    >
                      {label}
                    </text>
                  </g>
                )
              })}
              <circle cx={center} cy={center} r={size * 0.1} fill="#ffffff" stroke="rgb(22 26 34 / 0.1)" strokeWidth="1" />
              <circle cx={center} cy={center} r={size * 0.045} fill={INK} />
            </svg>
          </div>
        </div>
      </div>
    )
})
