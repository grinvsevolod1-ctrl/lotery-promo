import { Button } from '@/components/ui/button'
import { JackpotCounter } from '@/components/jackpot-counter'
import { DrawCountdown } from '@/components/draw-countdown'
import { BoltMark, BurstMark } from '@/components/icons'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[oklch(0.32_0.16_305)] via-[oklch(0.24_0.12_302)] to-background pt-24 pb-14 md:pt-32 md:pb-24">
      {/* single soft radial glow — light on the GPU, no heavy blur stacks */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-primary/20 blur-2xl md:h-[34rem] md:w-[34rem] md:left-auto md:-right-20 md:translate-x-0"
        aria-hidden="true"
      />

      <div className="container-page relative grid max-w-6xl items-center gap-8 md:grid-cols-2">
        <div className="text-center md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold animate-pop">
            <BoltMark className="size-4" />
            Тираж каждый день
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance sm:text-5xl md:text-6xl">
            Получи супер-
            <br className="hidden sm:block" />{' '}
            <span className="text-shimmer">джекпот</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg font-medium text-muted-foreground text-pretty md:mx-0">
            Впервые играешь в государственную лотерею? Скорее регистрируйся, лови удачу и забирай бонус на первый билет!
          </p>

          <div className="mt-7 flex flex-col items-center gap-4 md:items-start">
            <div className="rounded-3xl border border-gold/30 bg-[oklch(0.22_0.1_300)]/70 px-8 py-5 backdrop-blur">
              <JackpotCounter />
            </div>
            <DrawCountdown />
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
            <Button
              size="lg"
              nativeButton={false}
              render={<a href="#how-to" />}
              className="shine h-14 w-full rounded-full px-10 text-base font-bold uppercase tracking-wide animate-glow transition-transform hover:scale-[1.04] sm:w-auto"
            >
              <BurstMark className="size-5" />
              Получить бонус
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<a href="#prizes" />}
              className="h-14 w-full rounded-full border-gold/40 bg-transparent px-10 text-base font-bold uppercase tracking-wide text-gold hover:bg-gold/10 hover:text-gold sm:w-auto"
            >
              Призы
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-lg">
          {/* Art is baked on a deep-violet gradient matching the section, and its
              edges are faded with a radial mask so there is no visible box. */}
          <img
            src="/promo-hero.png"
            alt="Смартфон с приложением лотереи, золотые монеты и колёса фортуны"
            fetchPriority="high"
            className="w-full [mask-image:radial-gradient(ellipse_72%_72%_at_50%_48%,#000_60%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_72%_72%_at_50%_48%,#000_60%,transparent_100%)]"
          />
        </div>
      </div>
    </section>
  )
}
