import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[oklch(0.32_0.16_305)] via-[oklch(0.24_0.12_302)] to-background pt-28 pb-16 md:pt-32 md:pb-24">
      {/* radial glow */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[36rem] w-[36rem] rounded-full bg-primary/25 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 md:grid-cols-2">
        <div className="text-center md:text-left">
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl">
            Получи супер-
            <br className="hidden sm:block" /> джекпот
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg font-medium text-muted-foreground text-pretty md:mx-0">
            Впервые играешь в государственную лотерею? Скорее регистрируйся и лови удачу!
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              nativeButton={false}
              render={<a href="#how-to" />}
              className="h-14 rounded-full px-10 text-base font-bold uppercase tracking-wide shadow-xl shadow-primary/40 transition-transform hover:scale-[1.03]"
            >
              Получить бонус
            </Button>
          </div>
        </div>
        <div className="relative">
          <img
            src="/promo-hero.png"
            alt="Смартфон с приложением лотереи, золотые монеты и колёса фортуны"
            className="mx-auto w-full max-w-lg drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  )
}
