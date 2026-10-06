import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { GameTile, type LobbyGame } from "@/components/play/game-tile"

export function CategoryBanner({
  title,
  subtitle,
  href,
  games,
  cover,
  live = false,
}: {
  title: string
  subtitle: string
  href: string
  games?: readonly LobbyGame[]
  cover?: string
  live?: boolean
}) {
  if (cover) {
    return (
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-3xl bg-card p-2.5 pr-4 ring-1 ring-border transition hover:ring-primary/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl sm:size-20">
          <Image src={cover} alt="" fill sizes="80px" className="object-cover transition duration-300 group-hover:scale-105" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-extrabold text-foreground text-balance">{title}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground text-pretty">{subtitle}</span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <ChevronRight className="size-5" aria-hidden="true" />
        </span>
      </Link>
    )
  }

  return (
    <section className="rounded-3xl bg-card p-5 text-foreground ring-1 ring-border sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold text-balance sm:text-3xl">{title}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {live && (
              <span className="relative flex size-2.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
            )}
            {subtitle}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Играть
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {games && games.length > 0 && (
        <ul className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
          {games.map((game, index) => (
            <li key={game.id}>
              <GameTile game={game} size="sm" priority={index < 4} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
