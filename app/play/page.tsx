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
import { HeroSlider, type HeroSlide } from "@/components/play/hero-slider"
import { SoundToggle } from "@/components/play/sound-toggle"
import { WinsTicker } from "@/components/play/wins-ticker"

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "slots",
    href: "/play/games/slots",
    eyebrow: "Слоты",
    title: "Самые популярные слоты",
    text: "Sweet Bonanza, Gates of Olympus, Sugar Rush и другие хиты.",
    image: "/games/hero/slots.webp",
    cta: "Смотреть слоты",
  },
  {
    id: "live",
    href: "/play/games/live",
    eyebrow: "Live",
    title: "Живые дилеры 24/7",
    text: "Crazy Time, рулетка, блэкджек и баккара в реальном времени.",
    image: "/games/hero/live.webp",
    cta: "К столам",
  },
  {
    id: "plinko",
    href: "/play/plinko",
    eyebrow: "Мгновенно",
    title: "Plinko — результат за секунду",
    text: "Запускайте шарики и ловите высокие множители.",
    image: "/games/hero/plinko.webp",
    cta: "Играть",
  },
]

export default async function PlayPage() {
  const session = await requireSession()
  await settleLegacyTickets()
  const [balance, tickets, spinStatus] = await Promise.all([getBalance(), getTickets(), getSpinStatus()])

  const plinkoTop = Math.max(...plinkoMultipliers(PLINKO_MAX_ROWS, "high"))
  const scratchTop = Math.max(...SCRATCH_TIERS.map((tier) => tier.multiplier))

  const games: LobbyGame[] = [
    {
      id: "lottery",
      href: "/play/lottery",
      kicker: "Моментальная",
      title: "Лотерея",
      cover: "/games/covers/lottery.webp",
      badge: "Мгновенно",
      category: "lottery",
    },
    {
      id: "scratch",
      href: "/play/scratch",
      kicker: "Скретч-карта",
      title: SCRATCH_GAME_NAME,
      cover: "/games/covers/scratch.webp",
      badge: `до x${scratchTop}`,
      category: "lottery",
    },
    {
      id: "plinko",
      href: "/play/plinko",
      kicker: "Шарик и пины",
      title: "Plinko",
      cover: "/games/covers/plinko.webp",
      badge: `до ${formatMultiplier(plinkoTop)}`,
      category: "instant",
    },
    {
      id: "wheel",
      href: "/play/wheel",
      kicker: "Бесплатно",
      title: "Колесо удачи",
      cover: "/games/covers/wheel.webp",
      badge: spinStatus.spunToday ? "Завтра" : "Доступно",
      category: "instant",
    },
  ]

  return (
    <DepositGateProvider>
    <div className="flex flex-col gap-4">
      <PageHeading
        eyebrow="Игровой зал"
        title="Игры"
        description="Выберите игру — каждая открывается на отдельной странице."
        aside={
          <div className="flex items-center gap-2">
            <SoundToggle />
            <BalanceBadge balance={balance} />
          </div>
        }
      />

      <HeroSlider slides={HERO_SLIDES} />

      <WinsTicker />

      <ShowcaseBanner
        title="Слоты"
        subtitle={`${SLOTS_COUNT} популярных слотов`}
        href="/play/games/slots"
        games={BANNER_SLOTS}
      />

      <ShowcaseBanner
        title="Live Dealers"
        subtitle={`${LIVE_COUNT} столов с живыми дилерами`}
        href="/play/games/live"
        games={BANNER_LIVE}
      />

      <ShowcaseBanner title="Мгновенные игры" subtitle="Лотерея, Plinko, Скретч…" href="#catalog" />

      <CategoryBanner
        title="Все игры"
        subtitle={`${games.length} игры · результат сразу`}
        href="#catalog"
        games={games}
        live
      />

      <CategoryBanner
        title="Колесо удачи"
        subtitle={spinStatus.spunToday ? "Следующий прокрут — завтра" : "Бесплатный прокрут ждёт вас"}
        href="/play/wheel"
      />

      <CategoryBanner
        title="Мои билеты"
        subtitle={`Куплено билетов: ${tickets.length.toLocaleString("ru-RU")}`}
        href="/play/tickets"
      />

      <div className="mt-4">
        <GameLobby games={games} />
      </div>

      <div className="mt-6 flex flex-col gap-8">
        <ShowcaseRow id="slots" title="Slots" icon="gem" games={ROW_SLOTS} count={SLOTS_COUNT} href="/play/games/slots" />
        <ShowcaseRow id="top" title="Top" icon="top" games={ROW_TOP} count={ROW_TOP.length} href="/play/games/top" />
        <ShowcaseGrid id="live" title="Live" games={GRID_LIVE.slice(0, 9)} count={LIVE_COUNT} href="/play/games/live" />
      </div>
    </div>
    </DepositGateProvider>
  )
}
