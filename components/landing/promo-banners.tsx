import Image from "next/image"
import Link from "next/link"
import { CARD_BONUS, FIRST_DEPOSIT_CAP, RELOAD_RATE } from "@/lib/bonuses"
import { TOTAL_GAMES } from "@/lib/games/showcase"

const BANNERS = [
  {
    kicker: "Первое пополнение",
    title: `+100% до ${FIRST_DEPOSIT_CAP} BYN`,
    text: "Удваиваем первый депозит",
    image: "/bonuses/deposit.webp",
    href: "/sign-up",
  },
  {
    kicker: "Каталог",
    title: `${TOTAL_GAMES}+ игр`,
    text: "Слоты от Pragmatic, Hacksaw, Nolimit",
    image: "/games/hero/slots.webp",
    href: "#catalog",
  },
  {
    kicker: "Live-казино",
    title: "Дилеры 24/7",
    text: "Crazy Time, рулетка, блэкджек",
    image: "/games/hero/live.webp",
    href: "#live",
  },
  {
    kicker: "Колесо удачи",
    title: "Бесплатный спин",
    text: "Каждый день — бонус на баланс",
    image: "/bonuses/reload.webp",
    href: "#wheel",
  },
  {
    kicker: "Бонусы",
    title: `+${CARD_BONUS} BYN за карту`,
    text: `И кэшбэк ${Math.round(RELOAD_RATE * 100)}% каждую неделю`,
    image: "/bonuses/card.webp",
    href: "/sign-up",
  },
  {
    kicker: "Плинко",
    title: "Бросай шарик",
    text: "Множители прямо на глазах",
    image: "/games/hero/plinko.webp",
    href: "/sign-up",
  },
]

export function PromoBanners() {
  return (
    <section aria-label="Акции" className="mx-auto max-w-6xl pt-5">
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
        {BANNERS.map((banner, index) => (
          <li key={banner.title} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[32%]">
            <Link
              href={banner.href}
              className="group relative isolate flex aspect-[16/10] flex-col justify-end overflow-hidden rounded-3xl bg-foreground p-5 text-background transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Image
                src={banner.image}
                alt=""
                fill
                priority={index < 2}
                sizes="(min-width: 1024px) 370px, (min-width: 640px) 46vw, 78vw"
                className="-z-10 object-cover transition duration-500 group-hover:scale-105"
              />
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-foreground via-foreground/60 to-transparent" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">{banner.kicker}</span>
              <span className="mt-1 font-display text-2xl font-black leading-tight text-balance">{banner.title}</span>
              <span className="mt-1 text-sm text-background/80">{banner.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
