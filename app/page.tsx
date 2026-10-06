import { SiteHeader } from '@/components/site-header'
import { WinnersMarquee } from '@/components/winners-marquee'
import { PrizesSection } from '@/components/prizes-section'
import { FortuneWheel } from '@/components/fortune-wheel'
import { HowToSection } from '@/components/how-to-section'
import { FaqSection } from '@/components/faq-section'
import { TermsSection } from '@/components/terms-section'
import { SiteFooter } from '@/components/site-footer'
import { JsonLd, faqLd, organizationLd, websiteLd } from '@/components/json-ld'
import { WelcomePromo } from '@/components/welcome-promo'
import { LandingHero } from '@/components/landing/landing-hero'
import { PromoBanners } from '@/components/landing/promo-banners'
import { LandingGameRow } from '@/components/landing/landing-game-row'
import { StickySignup } from '@/components/landing/sticky-signup'
import { ALL_SLOTS, GRID_LIVE, NEW_GAMES, ROW_SLOTS } from '@/lib/games/showcase'
import { FAQ } from '@/lib/faq'

// The marquee shows real draw results, so the prerendered landing page is
// refreshed in the background at most every 5 minutes.
export const revalidate = 300

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <JsonLd data={[organizationLd, websiteLd, faqLd(FAQ)]} />
      <SiteHeader />
      <main className="flex-1 pb-24">
        <LandingHero />
        <PromoBanners />
        <WinnersMarquee />
        <LandingGameRow
          id="catalog"
          title="Популярные слоты"
          subtitle={`${ALL_SLOTS.length} слотов от топовых провайдеров`}
          games={ROW_SLOTS}
          total={ALL_SLOTS.length}
        />
        <LandingGameRow
          title="Новинки"
          subtitle="Свежие релизы этого сезона"
          games={NEW_GAMES.slice(0, 16)}
          total={NEW_GAMES.length}
        />
        <LandingGameRow
          id="live"
          title="Live-казино"
          subtitle="Живые дилеры круглосуточно"
          games={GRID_LIVE.slice(0, 16)}
          total={GRID_LIVE.length}
        />
        <PrizesSection />
        <FortuneWheel />
        <div className="cv-auto">
          <HowToSection />
        </div>
        <div className="cv-auto">
          <FaqSection />
        </div>
        <div className="cv-auto">
          <TermsSection />
        </div>
      </main>
      <SiteFooter />
      <StickySignup />
      <WelcomePromo />
    </div>
  )
}
