import { SiteHeader } from '@/components/site-header'
import { FaqSection } from '@/components/faq-section'
import { TermsSection } from '@/components/terms-section'
import { SiteFooter } from '@/components/site-footer'
import { JsonLd, faqLd, organizationLd, websiteLd } from '@/components/json-ld'
import { WelcomePromo } from '@/components/welcome-promo'
import { StickySignup } from '@/components/landing/sticky-signup'
import { SignupStrip } from '@/components/landing/signup-strip'
import { HeroSlider, type HeroSlide } from '@/components/play/hero-slider'
import { WinsTicker } from '@/components/play/wins-ticker'
import { CategoryBanner } from '@/components/play/category-banner'
import type { LobbyGame } from '@/components/play/game-tile'
import { ShowcaseBanner, ShowcaseGrid, ShowcaseRow } from '@/components/play/showcase-sections'
import { DepositGateProvider } from '@/components/play/deposit-gate'
import {
  BANNER_LIVE,
  BANNER_SLOTS,
  GRID_LIVE,
  LIVE_COUNT,
  NEW_GAMES,
  ROW_SLOTS,
  ROW_TOP,
  SLOTS_COUNT,
} from '@/lib/games/showcase'
import { WELCOME_BONUS } from '@/lib/lottery'
import { FAQ } from '@/lib/faq'

const signUp = (from: string) => `/sign-up?from=${from}`

const SLIDES: HeroSlide[] = [
  {
    id: 'welcome',
    href: signUp('slide-welcome'),
    eyebrow: 'Подарок новичкам',
    title: `${WELCOME_BONUS} BYN за регистрацию`,
    text: 'Без пополнения и без карты. Деньги на балансе через минуту.',
    image: '/landing/hero-bonus.webp',
    cta: 'Забрать бонус',
  },
  {
    id: 'deposit',
    href: signUp('slide-deposit'),
    eyebrow: 'Бонус x2',
    title: '+100% к первому пополнению',
    text: 'Пополните баланс — и мы удвоим сумму.',
    image: '/bonuses/deposit.webp',
    cta: 'Хочу x2',
  },
  {
    id: 'slots',
    href: signUp('slide-slots'),
    eyebrow: 'Слоты',
    title: `${SLOTS_COUNT}+ популярных слотов`,
    text: 'Sweet Bonanza, Gates of Olympus, Sugar Rush и новинки сезона.',
    image: '/games/hero/slots.webp',
    cta: 'Смотреть слоты',
  },
  {
    id: 'live',
    href: signUp('slide-live'),
    eyebrow: 'Live',
    title: 'Живые дилеры 24/7',
    text: 'Crazy Time, рулетка, блэкджек и баккара в реальном времени.',
    image: '/games/hero/live.webp',
    cta: 'К столам',
  },
  {
    id: 'plinko',
    href: signUp('slide-plinko'),
    eyebrow: 'Мгновенно',
    title: 'Plinko — результат за секунду',
    text: 'Запускайте шарики и ловите высокие множители.',
    image: '/games/hero/plinko.webp',
    cta: 'Играть',
  },
]

const BRAND_GAMES: LobbyGame[] = [
  { id: 'lottery', href: signUp('lottery'), kicker: 'Моментальная', title: 'Лотерея', cover: '/games/covers/lottery.webp', badge: 'Мгновенно', category: 'lottery' },
  { id: 'scratch', href: signUp('scratch'), kicker: 'Скретч-карта', title: 'Скретч', cover: '/games/covers/scratch.webp', badge: 'Скретч', category: 'lottery' },
  { id: 'plinko', href: signUp('plinko'), kicker: 'Шарик и пины', title: 'Plinko', cover: '/games/covers/plinko.webp', badge: 'Хит', category: 'instant' },
  { id: 'wheel', href: signUp('wheel'), kicker: 'Бесплатно', title: 'Колесо удачи', cover: '/games/covers/wheel.webp', badge: 'Free', category: 'instant' },
]

// The wins ticker is fetched client-side; the rest is static and safe to prerender.
export const revalidate = 300

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <JsonLd data={[organizationLd, websiteLd, faqLd(FAQ)]} />
      <SiteHeader />
      <DepositGateProvider guest>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-28 pt-4">
          <SignupStrip />
          <HeroSlider slides={SLIDES} />
          <WinsTicker />

          <ShowcaseBanner
            title="Слоты"
            subtitle={`${SLOTS_COUNT} популярных слотов`}
            href={signUp('slots')}
            games={BANNER_SLOTS}
          />
          <ShowcaseBanner
            title="Live Dealers"
            subtitle={`${LIVE_COUNT} столов с живыми дилерами`}
            href={signUp('live')}
            games={BANNER_LIVE}
          />
          <CategoryBanner
            title="Фирменные игры"
            subtitle="Лотерея, Скретч, Plinko, Колесо — результат сразу"
            href={signUp('brand')}
            games={BRAND_GAMES}
            live
          />

          <div className="mt-6 flex flex-col gap-8">
            <ShowcaseRow id="slots" title="Slots" icon="gem" games={ROW_SLOTS} count={SLOTS_COUNT} href={signUp('all-slots')} />
            <ShowcaseRow id="new" title="Новинки" icon="top" games={NEW_GAMES.slice(0, 16)} count={NEW_GAMES.length} href={signUp('new')} />
            <ShowcaseRow id="top" title="Top" icon="top" games={ROW_TOP} count={ROW_TOP.length} href={signUp('top')} />
            <ShowcaseGrid id="live" title="Live" games={GRID_LIVE.slice(0, 9)} count={LIVE_COUNT} href={signUp('all-live')} />
          </div>
        </main>
      </DepositGateProvider>
      <div className="cv-auto">
        <FaqSection />
      </div>
      <div className="cv-auto">
        <TermsSection />
      </div>
      <SiteFooter />
      <StickySignup />
      <WelcomePromo />
    </div>
  )
}
