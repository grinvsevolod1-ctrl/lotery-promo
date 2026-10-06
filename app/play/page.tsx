import { getBalance, getSpinStatus, getTickets } from "@/app/actions/cabinet"
import { settleLegacyTickets } from "@/lib/draws"
import { PageHeading } from "@/components/account/page-heading"
import { BalanceBadge } from "@/components/play/balance-badge"
import { CategoryBanner } from "@/components/play/category-banner"
import { GameLobby } from "@/components/play/game-lobby"
import type { LobbyGame } from "@/components/play/game-tile"
import { ShowcaseBanner, ShowcaseGrid, ShowcaseRow } from "@/components/play/showcase-sections"
import { DepositGateProvider } from "@/components/play/deposit-gate"
import { hasAnyDeposit } from "@/lib/crypto/deposits"
import { BANNER_LIVE, BANNER_SLOTS, GRID_LIVE, LIVE_COUNT, ROW_SLOTS, ROW_TOP, SLOTS_COUNT } from "@/lib/games/showcase"
import { formatMultiplier, plinkoMultipliers, PLINKO_MAX_ROWS } from "@/lib/games/plinko"
import { SCRATCH_GAME_NAME, SCRATCH_TIERS } from "@/lib/games/scratch"
import { requireSession } from "@/lib/require-session"

export default async function PlayPage() {
  const session = await requireSession()
  await settleLegacyTickets()
  const [balance, tickets, spinStatus, hasDeposit] = await Promise.all([
    getBalance(),
    getTickets(),
    getSpinStatus(),
    hasAnyDeposit(session.user.id),
  ])

  const plinkoTop = Math.max(...plinkoMultipliers(PLINKO_MAX_ROWS, "high"))
  const scratchTop = Math.max(...SCRATCH_TIERS.map((tier) => tier.multiplier))

  const games: LobbyGame[] = [
    {
      id: "lottery",
      href: "/play/lottery",
      kicker: "Моментальная",
      title: "Лотерея",
      cover: "/games/covers/lottery.png",
      badge: "Мгновенно",
      category: "lottery",
    },
    {
      id: "scratch",
      href: "/play/scratch",
      kicker: "Скретч-карта",
      title: SCRATCH_GAME_NAME,
      cover: "/games/covers/scratch.png",
      badge: `до x${scratchTop}`,
      category: "lottery",
    },
    {
      id: "plinko",
      href: "/play/plinko",
      kicker: "Шарик и пины",
      title: "Plinko",
      cover: "/games/covers/plinko.png",
      badge: `до ${formatMultiplier(plinkoTop)}`,
      category: "instant",
    },
    {
      id: "wheel",
      href: "/play/wheel",
      kicker: "Бесплатно",
      title: "Колесо удачи",
      cover: "/games/covers/wheel.png",
      badge: spinStatus.spunToday ? "Завтра" : "Доступно",
      category: "instant",
    },
  ]

  return (
    <DepositGateProvider hasDeposit={hasDeposit}>
    <div className="flex flex-col gap-4">
      <PageHeading
        eyebrow="Игровой зал"
        title="Игры"
        description="Выберите игру — каждая открывается на отдельной странице."
        aside={<BalanceBadge balance={balance} />}
      />

      <ShowcaseBanner
        title="Слоты"
        subtitle={`${SLOTS_COUNT} популярных слотов`}
        href="#slots"
        background="/games/showcase/gates-olympus.png"
        games={BANNER_SLOTS}
      />

      <ShowcaseBanner
        title="Live Dealers"
        subtitle={`${LIVE_COUNT} столов с живыми дилерами`}
        href="#live"
        background="/games/showcase/crazy-time.png"
        games={BANNER_LIVE}
      />

      <ShowcaseBanner
        title="Мгновенные игры"
        subtitle="Лотерея, Plinko, Скретч…"
        href="#catalog"
        background="/games/covers/plinko.png"
      />

      <CategoryBanner
        title="Все игры"
        subtitle={`${games.length} игры · результат сразу`}
        href="#catalog"
        background="/games/covers/lottery.png"
        games={games}
        live
      />

      <CategoryBanner
        title="Колесо удачи"
        subtitle={spinStatus.spunToday ? "Следующий прокрут — завтра" : "Бесплатный прокрут ждёт вас"}
        href="/play/wheel"
        background="/games/covers/wheel.png"
      />

      <CategoryBanner
        title="Мои билеты"
        subtitle={`Куплено билетов: ${tickets.length.toLocaleString("ru-RU")}`}
        href="/play/tickets"
        background="/games/covers/tickets.png"
      />

      <div className="mt-4">
        <GameLobby games={games} />
      </div>

      <div className="mt-6 flex flex-col gap-8">
        <ShowcaseRow id="slots" title="Slots" icon="gem" games={ROW_SLOTS} />
        <ShowcaseRow id="top" title="Top" icon="top" games={ROW_TOP} />
        <ShowcaseGrid id="live" title="Live" games={GRID_LIVE} />
      </div>
    </div>
    </DepositGateProvider>
  )
}
