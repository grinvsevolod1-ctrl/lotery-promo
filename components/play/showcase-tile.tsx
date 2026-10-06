"use client"

import Image from "next/image"
import { useDepositGate } from "@/components/play/deposit-gate"
import type { ShowcaseGame } from "@/lib/games/showcase"

export function ShowcaseTile({ game, size = "md" }: { game: ShowcaseGame; size?: "sm" | "md" }) {
  const { open } = useDepositGate()
  const small = size === "sm"
  return (
    <button
      type="button"
      onClick={() => open(game)}
      aria-label={`${[game.kicker, game.title, game.subtitle].filter(Boolean).join(" ")} — ${game.provider}`}
      className="group relative flex aspect-[3/4] w-full flex-col justify-end overflow-hidden rounded-2xl text-background transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{ backgroundColor: game.tint }}
    >
      <Image
        src={game.cover}
        alt=""
        fill
        sizes={small ? "(min-width: 640px) 140px, 25vw" : "(min-width: 640px) 220px, 42vw"}
        className="object-cover transition duration-300 group-hover:scale-105"
      />
      <span
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ backgroundImage: `linear-gradient(to top, ${game.tint} 30%, transparent)` }}
        aria-hidden="true"
      />
      {!small && game.rtp && (
        <span className="absolute right-2 top-2 rounded-lg bg-foreground/75 px-2 py-1 text-[11px] font-bold tabular-nums text-background backdrop-blur-sm">
          RTP: {game.rtp}%
        </span>
      )}
      <span aria-hidden="true" className={`relative flex flex-col items-center text-center ${small ? "px-1 pb-2" : "px-2 pb-3"}`}>
        {game.kicker && (
          <span className={`font-display font-black uppercase leading-tight ${small ? "text-[8px]" : "text-xs sm:text-sm"}`}>
            {game.kicker}
          </span>
        )}
        <span
          className={`font-display font-black uppercase leading-none text-balance drop-shadow ${small ? "text-[11px] sm:text-sm" : "text-lg sm:text-2xl"}`}
        >
          {game.title}
        </span>
        {game.subtitle && (
          <span className={`font-display font-black uppercase leading-tight ${small ? "text-[9px]" : "text-sm sm:text-base"}`}>
            {game.subtitle}
          </span>
        )}
        <span className={`mt-1 font-bold uppercase tracking-wider opacity-85 ${small ? "text-[6px] sm:text-[8px]" : "text-[10px]"}`}>
          {game.provider}
        </span>
      </span>
    </button>
  )
}
