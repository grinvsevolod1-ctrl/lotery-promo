import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BoltMark } from '@/components/icons'
import { GAMES, WELCOME_BONUS, topPrize } from '@/lib/lottery'

const cheapest = Math.min(...GAMES.map((g) => g.cost))
const biggest = Math.max(...GAMES.map(topPrize))

export function Hero() {
  return (
    <section className="grain relative overflow-hidden bg-gradient-to-b from-[oklch(0.32_0.16_305)] via-[oklch(0.24_0.12_302)] to-background pt-28 pb-12 md:pt-32 md:pb-20">
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 md:grid-cols-2">
        <div className="text-center md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold">
            <BoltMark className="size-4" />
            Результат сразу после покупки
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl">
            Моментальные лотереи <span className="text-shimmer">онлайн</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted-foreground text-pretty md:mx-0">
            Выберите игру, отметьте числа — и через секунду узнайте, выиграли ли вы. Никаких тиражей и ожидания.
          </p>

          <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-sm md:mx-0">
            <li className="flex items-center gap-3">
              <span className="size-2 shrink-0 rounded-full bg-gold" aria-hidden />
              <span>
                <b className="text-foreground">{WELCOME_BONUS} BYN</b> <span className="text-muted-foreground">на баланс сразу после регистрации</span>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="size-2 shrink-0 rounded-full bg-gold" aria-hidden />
              <span>
                <span className="text-muted-foreground">Билеты от</span> <b className="text-foreground">{cheapest} BYN</b>
                <span className="text-muted-foreground">, выигрыш до</span>{' '}
                <b className="text-foreground">{biggest.toLocaleString('ru-RU')} BYN</b>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="size-2 shrink-0 rounded-full bg-gold" aria-hidden />
              <span className="text-muted-foreground">Выигрыш зачисляется на баланс мгновенно</span>
            </li>
          </ul>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/sign-up" />}
              className="shine h-14 w-full rounded-full px-10 text-base font-bold uppercase tracking-wide animate-glow transition-transform hover:scale-[1.04] sm:w-auto"
            >
              Начать играть
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<a href="#games" />}
              className="h-14 w-full rounded-full border-gold/40 bg-transparent px-10 text-base font-bold uppercase tracking-wide text-gold hover:bg-gold/10 hover:text-gold sm:w-auto"
            >
              Все игры
            </Button>
          </div>
        </div>

        <div className="relative">
          {/* The artwork is rendered on its own dark square; a soft radial mask
              plus lighten blending dissolves that plate into the hero gradient
              while the phone, coins and glow stay crisp. */}
          <img
            src="/promo-hero-768.webp"
            srcSet="/promo-hero-512.webp 512w, /promo-hero-768.webp 768w, /promo-hero.webp 1024w"
            sizes="(min-width: 768px) 32rem, 90vw"
            alt="Смартфон с приложением лотереи, золотые монеты и колёса фортуны"
            width={1024}
            height={1024}
            fetchPriority="high"
            decoding="async"
            className="relative mx-auto w-full max-w-md mix-blend-lighten [mask-image:radial-gradient(closest-side,#000_62%,transparent_100%)]"
          />
        </div>
      </div>
    </section>
  )
}
