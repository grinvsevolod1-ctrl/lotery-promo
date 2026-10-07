import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const BACKGROUNDS = ["#FDE68A", "#BFDBFE", "#FBCFE8", "#BBF7D0", "#DDD6FE", "#FED7AA", "#A5F3FC", "#FECACA", "#E9D5FF", "#D9F99D"]

const INK = "#1F2937"
const PINK = "#F9A8D4"

function hash(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function Eyes({ color = INK, y = 36 }: { color?: string; y?: number }) {
  return (
    <>
      <circle cx="25" cy={y} r="2.8" fill={color} />
      <circle cx="39" cy={y} r="2.8" fill={color} />
      <circle cx="26" cy={y - 1} r="0.9" fill="#fff" />
      <circle cx="40" cy={y - 1} r="0.9" fill="#fff" />
    </>
  )
}

function Whiskers() {
  return (
    <g stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.55">
      <path d="M14 42h8M15 46l7-2M50 42h-8M49 46l-7-2" />
    </g>
  )
}

type Animal = { name: string; draw: () => ReactNode }

const ANIMALS: Animal[] = [
  {
    name: "Котик",
    draw: () => (
      <>
        <path d="M15 30 17 10l13 11ZM49 30 47 10 34 21Z" fill="#9CA3AF" />
        <path d="M18 24 19 15l6 5ZM46 24l-1-9-6 5Z" fill={PINK} />
        <circle cx="32" cy="38" r="18" fill="#9CA3AF" />
        <Eyes />
        <path d="M30 42h4l-2 2.5Z" fill={PINK} />
        <Whiskers />
      </>
    ),
  },
  {
    name: "Лисёнок",
    draw: () => (
      <>
        <path d="M14 30 16 9l14 12ZM50 30 48 9 34 21Z" fill="#F97316" />
        <path d="M16 15l1-6 5 4ZM48 15l-1-6-5 4Z" fill={INK} />
        <circle cx="32" cy="38" r="18" fill="#F97316" />
        <path d="M14 40c6 0 12 4 18 14 6-10 12-14 18-14-2 9-9 16-18 16s-16-7-18-16Z" fill="#fff" />
        <Eyes />
        <ellipse cx="32" cy="47" rx="2.6" ry="2" fill={INK} />
      </>
    ),
  },
  {
    name: "Мишка",
    draw: () => (
      <>
        <circle cx="17" cy="22" r="7" fill="#92400E" />
        <circle cx="47" cy="22" r="7" fill="#92400E" />
        <circle cx="17" cy="22" r="3.5" fill="#D6A57A" />
        <circle cx="47" cy="22" r="3.5" fill="#D6A57A" />
        <circle cx="32" cy="38" r="18" fill="#92400E" />
        <ellipse cx="32" cy="45" rx="9" ry="7" fill="#D6A57A" />
        <Eyes />
        <ellipse cx="32" cy="42" rx="3" ry="2.2" fill={INK} />
      </>
    ),
  },
  {
    name: "Панда",
    draw: () => (
      <>
        <circle cx="17" cy="22" r="7" fill={INK} />
        <circle cx="47" cy="22" r="7" fill={INK} />
        <circle cx="32" cy="38" r="18" fill="#fff" />
        <ellipse cx="24.5" cy="36.5" rx="5" ry="6" transform="rotate(-25 24.5 36.5)" fill={INK} />
        <ellipse cx="39.5" cy="36.5" rx="5" ry="6" transform="rotate(25 39.5 36.5)" fill={INK} />
        <Eyes color="#fff" />
        <ellipse cx="32" cy="45" rx="2.6" ry="1.8" fill={INK} />
      </>
    ),
  },
  {
    name: "Зайчик",
    draw: () => (
      <>
        <ellipse cx="24" cy="15" rx="5" ry="13" fill="#E5E7EB" />
        <ellipse cx="40" cy="15" rx="5" ry="13" fill="#E5E7EB" />
        <ellipse cx="24" cy="16" rx="2.4" ry="9" fill={PINK} />
        <ellipse cx="40" cy="16" rx="2.4" ry="9" fill={PINK} />
        <circle cx="32" cy="40" r="17" fill="#E5E7EB" />
        <Eyes y={38} />
        <path d="M30 43h4l-2 2Z" fill={PINK} />
        <rect x="30" y="46" width="4" height="4" rx="1" fill="#fff" stroke={INK} strokeWidth="0.6" />
      </>
    ),
  },
  {
    name: "Пёсик",
    draw: () => (
      <>
        <circle cx="32" cy="38" r="18" fill="#E7C9A0" />
        <ellipse cx="14.5" cy="36" rx="6" ry="12" transform="rotate(12 14.5 36)" fill="#8B5E3C" />
        <ellipse cx="49.5" cy="36" rx="6" ry="12" transform="rotate(-12 49.5 36)" fill="#8B5E3C" />
        <ellipse cx="32" cy="46" rx="8" ry="6" fill="#fff" />
        <Eyes />
        <ellipse cx="32" cy="43" rx="3.2" ry="2.4" fill={INK} />
        <path d="M30 49q2 3 4 0" fill="#F87171" />
      </>
    ),
  },
  {
    name: "Коала",
    draw: () => (
      <>
        <circle cx="14" cy="27" r="10" fill="#9CA3AF" />
        <circle cx="50" cy="27" r="10" fill="#9CA3AF" />
        <circle cx="14" cy="27" r="5.5" fill="#F3E8EE" />
        <circle cx="50" cy="27" r="5.5" fill="#F3E8EE" />
        <circle cx="32" cy="38" r="17" fill="#9CA3AF" />
        <Eyes />
        <ellipse cx="32" cy="43" rx="4" ry="5.5" fill={INK} />
      </>
    ),
  },
  {
    name: "Хрюша",
    draw: () => (
      <>
        <path d="M15 28 17 13l12 9ZM49 28 47 13 35 22Z" fill="#F472B6" />
        <circle cx="32" cy="38" r="18" fill="#F9A8D4" />
        <Eyes />
        <ellipse cx="32" cy="45" rx="7" ry="5" fill="#F472B6" />
        <ellipse cx="29.5" cy="45" rx="1.3" ry="1.8" fill="#9D174D" />
        <ellipse cx="34.5" cy="45" rx="1.3" ry="1.8" fill="#9D174D" />
      </>
    ),
  },
  {
    name: "Мышонок",
    draw: () => (
      <>
        <circle cx="16" cy="21" r="9" fill="#9CA3AF" />
        <circle cx="48" cy="21" r="9" fill="#9CA3AF" />
        <circle cx="16" cy="21" r="5" fill={PINK} />
        <circle cx="48" cy="21" r="5" fill={PINK} />
        <circle cx="32" cy="39" r="16" fill="#9CA3AF" />
        <Eyes y={37} />
        <circle cx="32" cy="44" r="2" fill={PINK} />
        <Whiskers />
      </>
    ),
  },
  {
    name: "Лягушонок",
    draw: () => (
      <>
        <circle cx="22" cy="24" r="8" fill="#4ADE80" />
        <circle cx="42" cy="24" r="8" fill="#4ADE80" />
        <ellipse cx="32" cy="40" rx="20" ry="15" fill="#4ADE80" />
        <circle cx="22" cy="24" r="5" fill="#fff" />
        <circle cx="42" cy="24" r="5" fill="#fff" />
        <circle cx="22.5" cy="24.5" r="2.6" fill={INK} />
        <circle cx="42.5" cy="24.5" r="2.6" fill={INK} />
        <path d="M22 43q10 8 20 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="19" cy="40" r="2.5" fill={PINK} opacity="0.7" />
        <circle cx="45" cy="40" r="2.5" fill={PINK} opacity="0.7" />
      </>
    ),
  },
  {
    name: "Львёнок",
    draw: () => (
      <>
        <circle cx="32" cy="37" r="24" fill="#C2410C" />
        <circle cx="19" cy="22" r="5" fill="#FBBF24" />
        <circle cx="45" cy="22" r="5" fill="#FBBF24" />
        <circle cx="32" cy="38" r="16" fill="#FBBF24" />
        <ellipse cx="32" cy="45" rx="7" ry="5" fill="#FDE68A" />
        <Eyes />
        <path d="M29.5 42h5L32 45Z" fill={INK} />
      </>
    ),
  },
  {
    name: "Пингвин",
    draw: () => (
      <>
        <circle cx="32" cy="38" r="19" fill={INK} />
        <path d="M32 30c-4-6-14-5-14 5 0 9 6 16 14 16s14-7 14-16c0-10-10-11-14-5Z" fill="#fff" />
        <Eyes y={37} />
        <path d="M28 42h8l-4 5Z" fill="#F59E0B" />
        <circle cx="21" cy="44" r="2.2" fill={PINK} opacity="0.7" />
        <circle cx="43" cy="44" r="2.2" fill={PINK} opacity="0.7" />
      </>
    ),
  },
]

export function pickAnimal(seed: string) {
  const h = hash(seed || "?")
  return { animal: ANIMALS[h % ANIMALS.length], background: BACKGROUNDS[(h >>> 8) % BACKGROUNDS.length] }
}

export function AnimalAvatar({
  seed,
  className,
  decorative = false,
}: {
  seed: string
  className?: string
  decorative?: boolean
}) {
  const { animal, background } = pickAnimal(seed)
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0 overflow-hidden rounded-full", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Аватар: ${animal.name}`}
    >
      <rect width="64" height="64" fill={background} />
      {animal.draw()}
    </svg>
  )
}
