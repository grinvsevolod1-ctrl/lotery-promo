import Image from "next/image"
import type { ShowcaseGame } from "@/lib/games/showcase"

export function ShowcaseTile({ game, size = "md" }: { game: ShowcaseGame; size?: "sm" | "md" }) {
  const small = size === "sm"
  return (
    <article
      aria-label={`${[game.kicker, game.title, game.subtitle].filter(Boolean).join(" ")} — ${game.provider}, скоро`}
      className="relative flex aspect-[3/4] w-full flex-col justify-end overflow-hidden rounded-2xl text-background"
      style={{ backgroundColor: game.tint }}
    >
      <Image
        src={game.cover}
        alt=""
        fill
        sizes={small ? "(min-width: 640px) 140px, 25vw" : "(min-width: 640px) 220px, 42vw"}
        className="object-cover"
      />
      <span
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ backgroundImage: `linear-gradient(to top, ${game.tint} 30%, transparent)` }}
        aria-hidden="true"
      />
      {!small && (
        <span className="absolute right-2 top-2 rounded-lg bg-foreground/75 px-2 py-1 text-[11px] font-bold backdrop-blur-sm">
          Скоро
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
    </article>
  )
}
