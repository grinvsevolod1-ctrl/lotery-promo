import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

// Five-point star, centred at (50,50) in a 100x100 box: outer radius 22, inner 9.5.
const STAR =
  "M50 28 55.58 42.31 70.92 43.2 59.03 52.94 62.93 67.8 50 59.5 37.07 67.8 40.97 52.94 29.08 43.2 44.42 42.31Z"
// Lucky seven, drawn as a path so it renders identically everywhere (no font dependency).
const SEVEN = "M284 224h58v12l-32 60h-20l30-56h-36z"

type Emblem = "star" | "seven"

/**
 * One face of the coin: milled rim, bevelled ring, dished field, beaded border
 * and an embossed emblem. `uid` namespaces the gradient ids so several coins
 * can live on one page.
 */
export function CoinFace({ uid, emblem, className }: { uid: string; emblem: Emblem; className?: string }) {
  const rim = `${uid}-rim`
  const field = `${uid}-field`
  const relief = `${uid}-relief`
  const gloss = `${uid}-gloss`

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn("block size-full", className)}>
      <defs>
        <linearGradient id={rim} x1="14" y1="10" x2="86" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff4c2" />
          <stop offset="0.3" stopColor="#f7c948" />
          <stop offset="0.62" stopColor="#dd9c1c" />
          <stop offset="1" stopColor="#a4660a" />
        </linearGradient>
        <radialGradient id={field} cx="0.36" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#ffe9a6" />
          <stop offset="0.5" stopColor="#f4c13a" />
          <stop offset="1" stopColor="#c47e0f" />
        </radialGradient>
        <linearGradient id={relief} x1="32" y1="26" x2="68" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff8d6" />
          <stop offset="0.45" stopColor="#fbd65c" />
          <stop offset="1" stopColor="#d1961a" />
        </linearGradient>
        <radialGradient id={gloss} cx="0.3" cy="0.2" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Disc with a dark outline so the coin reads on any background */}
      <circle cx="50" cy="50" r="49" fill="#8a580a" />
      <circle cx="50" cy="50" r="47.6" fill={`url(#${rim})`} />

      {/* Milled (reeded) edge: 76 ticks */}
      <circle
        cx="50"
        cy="50"
        r="45.2"
        fill="none"
        stroke="#8f5e0a"
        strokeWidth="2.4"
        strokeDasharray="1.25 2.487"
        opacity="0.7"
      />

      {/* Bevelled ring: light crest, dark foot */}
      <circle cx="50" cy="50" r="41.6" fill="none" stroke="#fff3c6" strokeWidth="1.5" opacity="0.95" />
      <circle cx="50" cy="50" r="40.1" fill="none" stroke="#a46a0d" strokeWidth="1.1" opacity="0.9" />

      {/* Dished field */}
      <circle cx="50" cy="50" r="39.5" fill={`url(#${field})`} />

      {/* Beaded border: 64 beads with a soft shadow under each */}
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke="#9e660b"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="0 3.436"
        transform="translate(0.45 0.6)"
        opacity="0.45"
      />
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke="#fff2c0"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeDasharray="0 3.436"
        opacity="0.95"
      />

      {/* Embossed emblem: shadow pass, then lit relief */}
      {emblem === "star" ? (
        <g transform="translate(0 1.5)">
          <path d={STAR} transform="translate(1.1 1.4)" fill="#8f5e0a" opacity="0.6" />
          <path d={STAR} fill={`url(#${relief})`} stroke="#a46a0d" strokeWidth="0.7" strokeLinejoin="round" />
        </g>
      ) : (
        <g transform="translate(50 51) scale(0.52) translate(-313 -260)">
          <path d={SEVEN} transform="translate(2.1 2.7)" fill="#8f5e0a" opacity="0.6" />
          <path d={SEVEN} fill={`url(#${relief})`} stroke="#a46a0d" strokeWidth="1.35" strokeLinejoin="round" />
        </g>
      )}

      {/* Specular highlight */}
      <circle cx="50" cy="50" r="47.6" fill={`url(#${gloss})`} />
    </svg>
  )
}

/**
 * A spinning gold coin that stands in for the letter "o" in the wordmark.
 * Two faces (star / lucky seven) plus a milled edge on a real 3D turn; the
 * delay staggers coins so they flip one after another.
 */
export function BrandCoin({ uid, delay = 0, className }: { uid: string; delay?: number; className?: string }) {
  return (
    <span className={cn("brand-coin", className)} style={{ "--coin-delay": `${delay}s` } as CSSProperties}>
      <span className="brand-coin-spinner">
        <span className="brand-coin-face">
          <CoinFace uid={`${uid}f`} emblem="star" />
        </span>
        <span className="brand-coin-face brand-coin-back">
          <CoinFace uid={`${uid}b`} emblem="seven" />
        </span>
        <span className="brand-coin-edge" />
      </span>
    </span>
  )
}
