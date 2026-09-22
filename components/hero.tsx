import { Button } from '@/components/ui/button'
import { JackpotCounter } from '@/components/jackpot-counter'
import { BoltMark, BurstMark } from '@/components/icons'

export function Hero() {
  return (
    <section className="grain relative overflow-hidden bg-gradient-to-b from-[oklch(0.32_0.16_305)] via-[oklch(0.24_0.12_302)] to-background pt-28 pb-16 md:pt-32 md:pb-24">
      {/* radial glows */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[36rem] w-[36rem] rounded-full bg-primary/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-32 top-40 h-[30rem] w-[30rem] rounded-full bg-gold/15 blur-3xl"
        aria-hidden="true"
      />
      {/* scattered twinkles */}
      {[
        { t: '12%', l: '8%', d: '0s' },
        { t: '22%', l: '46%', d: '1.1s' },
        { t: '68%', l: '14%', d: '0.6s' },
        { t: '40%', l: '90%', d: '1.6s' },
        { t: '82%', l: '60%', d: '0.3s' },
      ].map((s, i) => (
        <BurstMark
          key={i}
          className="pointer-events-none absolute h-5 w-5 text-gold animate-twinkle"
          style={{ top: s.t, left: s.l, animationDelay: s.d }}
        />
      ))}

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 md:grid-cols-2">
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

          <div className="mt-7 flex justify-center md:justify-start">
            <div className="rounded-3xl border border-gold/30 bg-[oklch(0.22_0.1_300)]/70 px-8 py-5 backdrop-blur">
              <JackpotCounter />
            </div>
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

        <div className="relative">
          {/* spinning wheel behind the phone */}
          <img
            src="/promo-wheels.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 w-[26rem] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-40 blur-[1px] animate-spin-slow"
          />
          <img
            src="/promo-hero.png"
            alt="Смартфон с приложением лотереи, золотые монеты и колёса фортуны"
            className="relative mx-auto w-full max-w-lg drop-shadow-2xl animate-float"
          />
          {/* floating coins */}
          <img
            src="/promo-slot.png"
            alt=""
            aria-hidden="true"
            className="absolute -bottom-4 -left-2 w-24 animate-float drop-shadow-xl [--r:-8deg]"
            style={{ animationDelay: '0.6s' }}
          />
          <img
            src="/promo-phone.png"
            alt=""
            aria-hidden="true"
            className="absolute -right-2 top-4 w-20 animate-float drop-shadow-xl [--r:10deg]"
            style={{ animationDelay: '1.2s' }}
          />
        </div>
      </div>
    </section>
  )
}
