import Link from 'next/link'
import { GAMES, WELCOME_BONUS, topPrize } from '@/lib/lottery'

const jackpotGame = GAMES.reduce((best, game) => (topPrize(game) > topPrize(best) ? game : best))
const jackpot = topPrize(jackpotGame)
const cheapest = Math.min(...GAMES.map((g) => g.cost))

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pt-6 sm:px-5 md:pt-8">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="relative isolate flex min-h-80 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1f5be0] via-[#1a47c4] to-[#0f2c8f] p-6 text-white sm:p-8 md:min-h-96">
          <div className="relative z-10 flex max-w-md flex-col justify-center">
            <p className="text-sm font-semibold text-white/80">Моментальная лотерея {jackpotGame.name}</p>
            <h1 id="hero-title" className="mt-2 font-display text-3xl font-black uppercase leading-none tracking-tight sm:text-5xl">
              Джекпот
            </h1>
            <div className="mt-4 w-fit rounded-3xl bg-gradient-to-b from-[#ff8a3d] to-primary px-5 py-3 shadow-lg shadow-black/25 ring-4 ring-white/15 sm:px-7">
              <p className="font-display text-4xl font-black leading-none tracking-tight sm:text-6xl">
                {jackpot.toLocaleString('ru-RU')}
                <span className="ml-2 align-top text-base font-extrabold uppercase sm:text-xl">BYN</span>
              </p>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85 text-pretty sm:text-base">
              Отметьте числа и узнайте результат сразу. Без тиражей и ожидания.
            </p>
            <Link
              href="/sign-up"
              className="mt-6 inline-flex h-12 w-fit items-center rounded-full bg-white px-7 text-sm font-extrabold uppercase tracking-wide text-primary shadow-lg shadow-black/20 transition-transform hover:scale-[1.03]"
            >
              Хочу выиграть
            </Link>
          </div>
          <img
            src="/promo-hero-768.webp"
            srcSet="/promo-hero-512.webp 512w, /promo-hero-768.webp 768w, /promo-hero.webp 1024w"
            sizes="(min-width: 1024px) 26rem, 60vw"
            alt=""
            aria-hidden="true"
            width={1024}
            height={1024}
            fetchPriority="high"
            decoding="async"
            className="pointer-events-none absolute -right-16 bottom-0 -z-0 w-[70%] max-w-md opacity-40 mix-blend-lighten [mask-image:radial-gradient(closest-side,#000_60%,transparent_100%)] sm:-right-6 sm:opacity-90"
          />
        </div>

        <div className="flex flex-col justify-between gap-6 rounded-3xl bg-gradient-to-br from-[#0b6fd1] to-[#0a4fa6] p-6 text-white sm:p-8">
          <div>
            <p className="text-sm font-semibold text-white/80">Бонус за регистрацию</p>
            <p className="mt-3 font-display text-5xl font-black leading-none tracking-tight">
              {WELCOME_BONUS} <span className="text-2xl">BYN</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/85 text-pretty">
              Зачисляем на баланс сразу. Билеты от {cheapest} BYN.
            </p>
          </div>
          <Link
            href="/sign-up"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-lg shadow-black/25 transition-transform animate-glow hover:scale-[1.03]"
          >
            Купить билетик
          </Link>
        </div>
      </div>
    </section>
  )
}
