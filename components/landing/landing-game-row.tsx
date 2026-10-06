import Image from "next/image"
import Link from "next/link"
import type { ShowcaseGame } from "@/lib/games/showcase"

function LandingTile({ game }: { game: ShowcaseGame }) {
  const name = [game.kicker, game.title, game.subtitle].filter(Boolean).join(" ")
  return (
    <Link
      href="/sign-up"
      aria-label={`${name} — ${game.provider}`}
      className="group relative flex aspect-[3/4] w-full flex-col justify-end overflow-hidden rounded-2xl text-background transition duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{ backgroundColor: game.tint }}
    >
      <Image
        src={game.cover}
        alt=""
        fill
        sizes="(min-width: 640px) 160px, 34vw"
        className="object-cover transition duration-300 group-hover:scale-105"
        style={game.hue ? { filter: `hue-rotate(${game.hue}deg)` } : undefined}
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ backgroundImage: `linear-gradient(to top, ${game.tint} 30%, transparent)` }}
      />
      {game.isNew && (
        <span className="absolute left-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-primary-foreground">
          New
        </span>
      )}
      <span aria-hidden="true" className="relative flex flex-col items-center px-2 pb-3 text-center">
        {game.kicker && <span className="font-display text-[11px] font-black uppercase leading-tight">{game.kicker}</span>}
        <span className="font-display text-base font-black uppercase leading-none text-balance drop-shadow sm:text-lg">{game.title}</span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider opacity-85">{game.provider}</span>
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center bg-foreground/50 opacity-0 transition group-hover:opacity-100"
      >
        <span className="rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground">Играть</span>
      </span>
    </Link>
  )
}

export function LandingGameRow({
  id,
  title,
  subtitle,
  games,
  total,
}: {
  id?: string
  title: string
  subtitle: string
  games: readonly ShowcaseGame[]
  total: number
}) {
  return (
    <section id={id} aria-label={title} className="mx-auto max-w-6xl scroll-mt-20 pt-8">
      <div className="flex items-end justify-between gap-3 px-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Link
          href="/sign-up"
          className="shrink-0 rounded-xl bg-card px-4 py-2.5 text-sm font-bold text-foreground ring-1 ring-border transition hover:ring-primary"
        >
          Все {total}
        </Link>
      </div>
      <ul className="mt-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:gap-3 sm:px-5 [&::-webkit-scrollbar]:hidden">
        {games.map((game) => (
          <li key={game.id} className="w-[34%] shrink-0 snap-start sm:w-40">
            <LandingTile game={game} />
          </li>
        ))}
      </ul>
    </section>
  )
}
