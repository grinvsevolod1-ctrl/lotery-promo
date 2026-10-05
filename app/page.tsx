import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { WinnersMarquee } from '@/components/winners-marquee'
import { PrizesSection } from '@/components/prizes-section'
import { FortuneWheel } from '@/components/fortune-wheel'
import { HowToSection } from '@/components/how-to-section'
import { FaqSection } from '@/components/faq-section'
import { TermsSection } from '@/components/terms-section'
import { SiteFooter } from '@/components/site-footer'
import { JsonLd, faqLd, organizationLd, websiteLd } from '@/components/json-ld'
import { FAQ } from '@/lib/faq'

// The marquee shows real draw results, so the prerendered landing page is
// refreshed in the background at most every 5 minutes.
export const revalidate = 300

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <JsonLd data={[organizationLd, websiteLd, faqLd(FAQ)]} />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <WinnersMarquee />
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
    </div>
  )
}
