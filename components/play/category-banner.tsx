import Image from "next/image"
import Link from "next/link"
import { ArrowRightMark } from "@/components/icons"
import { GameTile, type LobbyGame } from "@/components/play/game-tile"

export function CategoryBanner({
  title,
  subtitle,
  href,
  games,
  background,
  live = false,
}: {
  title: string
  subtitle: string
  href: string
  games?: readonly LobbyGame[]
  background: string
  live?: boolean
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-foreground p-5 text-background sm:p-6">
      <Image src={background} alt="" fill sizes="(min-width: 768px) 720px, 100vw" className="-z-20 object-cover opacity-30 blur-sm" />
      <span className="absolute inset-0 -z-10 bg-foreground/60" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold text-balance sm:text-3xl">{title}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-background/80">
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
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background sm:px-5 sm:text-base"
        >
          Играть
          <ArrowRightMark className="size-4" aria-hidden="true" />
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
