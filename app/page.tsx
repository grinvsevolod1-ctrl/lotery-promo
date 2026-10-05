import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { WinnersMarquee } from '@/components/winners-marquee'
import { PrizesSection } from '@/components/prizes-section'
import { FortuneWheel } from '@/components/fortune-wheel'
import { HowToSection } from '@/components/how-to-section'
import { FaqSection } from '@/components/faq-section'
import { TermsSection } from '@/components/terms-section'
import { SiteFooter } from '@/components/site-footer'

// The marquee shows real draw results, so the prerendered landing page is
// refreshed in the background at most every 5 minutes.
export const revalidate = 300

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <WinnersMarquee />
        <PrizesSection />
        <FortuneWheel />
        <HowToSection />
        <FaqSection />
        <TermsSection />
      </main>
      <SiteFooter />
    </div>
  )
}
