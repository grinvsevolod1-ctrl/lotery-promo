import Image from "next/image"
import { WELCOME_BONUS } from "@/lib/lottery"
import { TOTAL_GAMES } from "@/lib/games/showcase"
import { HeroCta } from "@/components/landing/hero-cta"

const PERKS = ["Без пополнения", "Без привязки карты", "Сразу на баланс"]

export function LandingHero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pt-4 sm:px-5 md:pt-6">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-foreground text-background shadow-[0_24px_60px_-24px] shadow-primary/50">
        <Image
          src="/landing/hero-bonus.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="-z-10 object-cover object-[70%_center] opacity-80 sm:object-right sm:opacity-100"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-foreground via-foreground/80 to-foreground/20 sm:bg-gradient-to-r sm:from-foreground sm:via-foreground/85 sm:to-transparent"
        />

        <div className="flex min-h-[460px] max-w-xl flex-col justify-end gap-5 p-6 sm:min-h-[480px] sm:justify-center sm:p-10">
          <p className="flex w-fit items-center gap-2 rounded-full bg-primary/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary ring-1 ring-primary/40">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Подарок новым игрокам
          </p>

          <h1 id="hero-title" className="font-display font-black leading-none tracking-tight">
            <span className="block text-2xl sm:text-3xl">Дарим</span>
            <span className="mt-1 block text-7xl text-primary drop-shadow-[0_6px_24px_rgb(255_100_22/0.55)] sm:text-8xl">
              {WELCOME_BONUS} BYN
            </span>
            <span className="mt-2 block text-2xl text-balance sm:text-3xl">просто за регистрацию</span>
          </h1>

          <ul className="flex flex-wrap gap-2">
            {PERKS.map((perk) => (
              <li key={perk} className="rounded-full bg-background/10 px-3 py-1.5 text-xs font-semibold text-background ring-1 ring-background/15 backdrop-blur-sm sm:text-sm">
                {perk}
              </li>
            ))}
          </ul>

          <HeroCta />

          <p className="text-xs leading-relaxed text-background/70 sm:text-sm">
            Регистрация за 30 секунд · {TOTAL_GAMES}+ игр · Выигрыш выводится на карту
          </p>
        </div>
      </div>
    </section>
  )
}
