import type { SVGProps } from 'react'

/*
 * Authorial icon set for lotery.by.
 * Hand-built geometric marks — no third-party icon library.
 * All icons share a 24x24 canvas, 1.8 stroke, round joins for a cohesive look.
 */

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/* Lottery ticket with a torn perforation edge and a lucky clover punch */
export function TicketMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2v0a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 1 0-4Z" />
      <path d="M12 9.2c-.9-1.1-2.6-.4-2.2 1 .3 1 2.2 1.8 2.2 1.8s1.9-.8 2.2-1.8c.4-1.4-1.3-2.1-2.2-1z" />
      <path d="M12 13v2.4" />
    </svg>
  )
}

/* Lightning — daily draw energy */
export function BoltMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13.5 3 5 13.2h5.2L9.5 21 18 10.4h-5.4L13.5 3Z" />
    </svg>
  )
}

/* Four-point burst star — replaces generic sparkle */
export function BurstMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5c.6 4.6 2.1 6.4 6.9 7.5-4.8 1.1-6.3 2.9-6.9 7.5-.6-4.6-2.1-6.4-6.9-7.5 4.8-1.1 6.3-2.9 6.9-7.5Z" />
      <path d="M18.6 15.5c.3 1.9.9 2.6 2.9 3-2 .5-2.6 1.2-2.9 3-.3-1.8-.9-2.5-2.9-3 2-.4 2.6-1.1 2.9-3Z" />
    </svg>
  )
}

/* Trophy cup for winners */
export function TrophyMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4.5a2.5 2.5 0 0 0 2.7 3.5M17 5h2.5a2.5 2.5 0 0 1-2.7 3.5" />
      <path d="M12 13v3M9 20h6M10 20l.4-2.2a1.6 1.6 0 0 1 3.2 0L14 20" />
    </svg>
  )
}

/* Paper plane — Telegram-style share */
export function PlaneMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20.5 4 3.8 11.2c-.8.3-.7 1.5.1 1.7l4.6 1.3 1.4 4.9c.2.8 1.3.9 1.7.2l2-3.2 4.2 3.1c.6.4 1.5.1 1.6-.7L21.6 5c.1-.8-.6-1.4-1.1-1Z" />
      <path d="M20.5 5 9 14" />
    </svg>
  )
}

/* Speech orb — community / chat */
export function OrbChatMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4a8 8 0 0 1 0 16H5.5l1.8-2.4A8 8 0 0 1 12 4Z" />
      <path d="M9 12h.01M12 12h.01M15 12h.01" />
    </svg>
  )
}

/* Share nodes */
export function ShareMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="17.5" cy="6" r="2.4" />
      <circle cx="17.5" cy="18" r="2.4" />
      <path d="M8.1 10.9 15.4 7.1M8.1 13.1l7.3 3.8" />
    </svg>
  )
}

/* Chevrons for carousel */
export function ArrowLeftMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 6 9 12l5.5 6" />
    </svg>
  )
}

export function ArrowRightMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 6 15 12l-5.5 6" />
    </svg>
  )
}

/* Plus/cross toggle for the FAQ accordion */
export function PlusMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/* Question glyph inside a rounded diamond — authorial FAQ marker */
export function QueryMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.6 21.4 12 12 21.4 2.6 12 12 2.6Z" />
      <path d="M9.8 9.6a2.2 2.2 0 0 1 4.3.6c0 1.5-2.1 1.8-2.1 3.2" />
      <path d="M12 16.4h.01" />
    </svg>
  )
}

/* Coin with a ruble-ish glyph for the jackpot */
export function CoinMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5.6" strokeDasharray="1 2.2" />
      <path d="M10 8.4h2.4a1.8 1.8 0 0 1 0 3.6H10V7.6M10 12.6h3.4M10 10.6v4.8" />
    </svg>
  )
}

/* Alias used by the auth form */
export const CloverTicket = TicketMark

/* User silhouette in a soft frame */
export function UserMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8.5" r="3.3" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

/* Logout — door with arrow */
export function LogoutMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14 5.5H6.5a1.5 1.5 0 0 0-1.5 1.5v10a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="M17 8.5 20.5 12 17 15.5M20 12h-9" />
    </svg>
  )
}

/* Wallet with a coin slot */
export function WalletMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v1" />
      <path d="M4 8v9a2 2 0 0 0 2 2h12a1.5 1.5 0 0 0 1.5-1.5V11A1.5 1.5 0 0 0 18 9.5H6" />
      <path d="M17 12.5h.01" />
    </svg>
  )
}

/* Shield for admin / trust */
export function ShieldMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 5.5v5.2c0 4.4 2.9 7.6 7 9.3 4.1-1.7 7-4.9 7-9.3V5.5L12 3Z" />
      <path d="m9 12 2 2 4-4.5" />
    </svg>
  )
}

/* Gauge / dashboard */
export function GaugeMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M4 15h2M18 15h2M12 5v2M6.3 9.3l1.4 1.4" />
      <path d="M12 15 15 11" />
    </svg>
  )
}
