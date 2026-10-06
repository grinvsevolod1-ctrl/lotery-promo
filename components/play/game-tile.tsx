import Image from "next/image"
import Link from "next/link"

export type LobbyGame = {
  id: string
  href: string
  title: string
  kicker: string
  cover: string
  badge: string
  category: "lottery" | "instant"
}

export function GameTile({ game, priority = false, size = "md" }: { game: LobbyGame; priority?: boolean; size?: "sm" | "md" }) {
  return (
    <Link
      href={game.href}
      className="group relative flex aspect-[3/4] w-full flex-col justify-end overflow-hidden rounded-2xl bg-foreground ring-1 ring-border transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Image
        src={game.cover}
        alt=""
        fill
        priority={priority}
        sizes={size === "sm" ? "(min-width: 640px) 140px, 25vw" : "(min-width: 640px) 220px, 42vw"}
        className="object-cover transition duration-300 group-hover:scale-105"
      />
      <span className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-foreground via-foreground/70 to-transparent" aria-hidden="true" />
      {size === "md" && (
        <span className="absolute right-2 top-2 rounded-lg bg-foreground/75 px-2 py-1 text-[11px] font-bold text-background backdrop-blur-sm">
          {game.badge}
        </span>
      )}
      <span className="relative flex flex-col items-center px-2 pb-3 text-center text-background">
        {size === "md" && <span className="text-[11px] font-extrabold uppercase tracking-wide opacity-90">{game.kicker}</span>}
        <span
          className={`font-display font-black uppercase leading-none text-balance ${size === "sm" ? "text-xs" : "text-lg sm:text-xl"}`}
        >
          {game.title}
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-75">bytoloto</span>
      </span>
    </Link>
  )
}
