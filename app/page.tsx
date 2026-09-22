import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { GamesSection } from '@/components/games-section'
import { ResultsSection } from '@/components/results-section'
import { TicketChecker } from '@/components/ticket-checker'
import { SocialImpact } from '@/components/social-impact'
import { SiteFooter } from '@/components/site-footer'

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <GamesSection />
        <ResultsSection />
        <TicketChecker />
        <SocialImpact />
      </main>
      <SiteFooter />
    </div>
  )
}
