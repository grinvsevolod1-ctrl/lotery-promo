import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftMark } from "@/components/icons"
import { DepositGateProvider } from "@/components/play/deposit-gate"
import { ShowcaseTile } from "@/components/play/showcase-tile"
import { isShowcaseCategory, SHOWCASE_CATEGORIES } from "@/lib/games/showcase"
import { requireSession } from "@/lib/require-session"

export function generateStaticParams() {
  return Object.keys(SHOWCASE_CATEGORIES).map((category) => ({ category }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  if (!isShowcaseCategory(category)) return {}
  return { title: SHOWCASE_CATEGORIES[category].title, description: SHOWCASE_CATEGORIES[category].description }
}

export default async function ShowcaseCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  await requireSession()
  const { category } = await params
  if (!isShowcaseCategory(category)) notFound()
  const { title, description, games } = SHOWCASE_CATEGORIES[category]

  return (
    <DepositGateProvider>
      <div className="flex flex-col gap-5">
        <header className="flex items-center gap-4">
          <Link
            href="/play"
            aria-label="Назад к играм"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:brightness-110 active:scale-95"
          >
            <ArrowLeftMark className="size-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold text-balance">{title}</h1>
            <p className="text-sm text-muted-foreground text-pretty">
              {description} · {games.length} игр
            </p>
          </div>
        </header>

        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {games.map((game, index) => (
            <li key={game.id}>
              <ShowcaseTile game={game} index={index} />
            </li>
          ))}
        </ul>
      </div>
    </DepositGateProvider>
  )
}
