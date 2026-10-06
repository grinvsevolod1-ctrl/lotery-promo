import Image from "next/image"
import Link from "next/link"
import { ArrowRightMark } from "@/components/icons"
import { ShowcaseTile } from "@/components/play/showcase-tile"
import type { ShowcaseGame } from "@/lib/games/showcase"

function PlayButton({ href, arrow = true }: { href: string; arrow?: boolean }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background sm:px-5 sm:text-base"
    >
      Играть
      {arrow && <ArrowRightMark className="size-4" aria-hidden="true" />}
    </Link>
  )
}

export function ShowcaseBanner({
  title,
  subtitle,
  href,
  background,
  games,
}: {
  title: string
  subtitle: string
  href: string
  background: string
  games?: readonly ShowcaseGame[]
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-foreground p-5 text-background sm:p-6">
      <Image src={background} alt="" fill sizes="(min-width: 768px) 720px, 100vw" className="-z-20 object-cover opacity-40 blur-sm" />
      <span className="absolute inset-0 -z-10 bg-foreground/60" aria-hidden="true" />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold text-balance sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-background/80 text-pretty">{subtitle}</p>
        </div>
        <PlayButton href={href} arrow={Boolean(games)} />
      </div>
      {games && (
        <ul className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
          {games.map((game) => (
            <li key={game.id}>
              <ShowcaseTile game={game} size="sm" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SectionHeading({ id, title, count, icon }: { id: string; title: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-3 font-display text-2xl font-extrabold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <span className="rounded-xl px-3 py-2 text-sm font-bold text-primary ring-2 ring-primary">Все игры ({count})</span>
    </div>
  )
}

const GemIcon = (
  <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
    <path d="M6 3h12l4 6-10 12L2 9l4-6Zm1.2 2L4.8 8.5h4.4L10.6 5H7.2Zm6.2 0 1.4 3.5h4.4L16.8 5h-3.4Zm-1.4.6L10.9 8.5h2.2L12 5.6ZM5.3 10.5 11 17.3l-2.2-6.8H5.3Zm5.6 0L12 14l1.1-3.5h-2.2Zm4.3 0L13 17.3l5.7-6.8h-3.5Z" />
  </svg>
)

const TopIcon = (
  <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
    <path d="M3 4h18v16H3V4Zm2 13.5h14L12 11l-7 6.5Z" />
  </svg>
)

const LiveIcon = (
  <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
    <path d="M12 2a8 8 0 0 1 8 8v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a8 8 0 0 1 8-8Zm-3 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
  </svg>
)

export function ShowcaseRow({ id, title, icon, games }: { id: string; title: string; icon: "gem" | "top"; games: readonly ShowcaseGame[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <SectionHeading id={id} title={title} count={games.length} icon={icon === "gem" ? GemIcon : TopIcon} />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {games.map((game) => (
          <li key={game.id} className="w-[42%] shrink-0 snap-start sm:w-52">
            <ShowcaseTile game={game} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ShowcaseGrid({ id, title, games }: { id: string; title: string; games: readonly ShowcaseGame[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <SectionHeading id={id} title={title} count={games.length} icon={LiveIcon} />
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {games.map((game) => (
          <li key={game.id}>
            <ShowcaseTile game={game} />
          </li>
        ))}
      </ul>
    </section>
  )
}
