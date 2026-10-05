import type { ScratchSymbol } from "@/lib/games/scratch"
import { cn } from "@/lib/utils"

const TONES: Record<ScratchSymbol, string> = {
  clover: "from-[#7ed957] to-[#2f9e44] text-white",
  star: "from-[#ffd43b] to-[#f08c00] text-white",
  crown: "from-[#ffa94d] to-[#ff6416] text-white",
  diamond: "from-[#74c0fc] to-[#1f5be0] text-white",
  coin: "from-[#ffe066] to-[#e8a400] text-white",
  seven: "from-[#ff8787] to-[#d9281e] text-white",
}

function Glyph({ symbol }: { symbol: ScratchSymbol }) {
  switch (symbol) {
    case "clover":
      return (
        <path d="M12 12c-2.5-3-6-3.2-6-.2 0 2.6 3.3 2.2 6 .2Zm0 0c3-2.5 3.2-6 .2-6-2.6 0-2.2 3.3-.2 6Zm0 0c2.5 3 6 3.2 6 .2 0-2.6-3.3-2.2-6-.2Zm0 0c-3 2.5-3.2 6-.2 6 2.6 0 2.2-3.3.2-6Zm0 0 3 8" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      )
    case "star":
      return <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" fill="currentColor" />
    case "crown":
      return <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5Zm2 11.5h14" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    case "diamond":
      return <path d="M6 4h12l3 5-9 11L3 9Zm-3 5h18M9 4l3 16 3-16" fill="currentColor" stroke="rgba(255,255,255,.55)" strokeWidth="1" strokeLinejoin="round" />
    case "coin":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" fill="currentColor" />
          <circle cx="12" cy="12" r="6" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
          <text x="12" y="15.6" textAnchor="middle" fontSize="9" fontWeight="900" fill="rgba(0,0,0,.35)">
            B
          </text>
        </>
      )
    case "seven":
      return <path d="M6 4h12l-6.5 16h-3.6L13.8 7.4H6Z" fill="currentColor" />
  }
}

export function ScratchSymbolBadge({ symbol, className }: { symbol: ScratchSymbol; className?: string }) {
  return (
    <span className={cn("grid aspect-square place-items-center rounded-full bg-gradient-to-br shadow-inner", TONES[symbol], className)}>
      <svg viewBox="0 0 24 24" className="size-[58%] drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]" aria-hidden="true">
        <Glyph symbol={symbol} />
      </svg>
    </span>
  )
}
