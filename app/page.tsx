import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { WinnersMarquee } from '@/components/winners-marquee'
import { PrizesSection } from '@/components/prizes-section'
import { HowToSection } from '@/components/how-to-section'
import { TermsSection } from '@/components/terms-section'
import { SiteFooter } from '@/components/site-footer'

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <WinnersMarquee />
        <PrizesSection />
        <HowToSection />
        <TermsSection />
      </main>
      <SiteFooter />
    </div>
  )
}
