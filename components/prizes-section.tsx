'use client'

import { useState } from 'react'
import { ArrowLeftMark, ArrowRightMark } from '@/components/icons'
import { Reveal } from '@/components/reveal'
import { Button } from '@/components/ui/button'
import { GAMES, MAX_NUMBER, NUMBERS_PER_TICKET, PRIZE_BY_MATCHES } from '@/lib/lottery'

const topPrize = PRIZE_BY_MATCHES[NUMBERS_PER_TICKET]

const prizes = GAMES.map((game) => ({
  name: game.name,
  cost: `${game.cost} BYN за билет`,
  max: `${topPrize.toLocaleString('ru-RU')} BYN`,
}))

const tiers = Object.entries(PRIZE_BY_MATCHES)
  .map(([matches, prize]) => ({ matches: Number(matches), prize }))
  .sort((a, b) => b.matches - a.matches)

export function PrizesSection() {
  const [index, setIndex] = useState(0)
  const prize = prizes[index]

  const go = (dir: number) => {
    setIndex((i) => (i + dir + prizes.length) % prizes.length)
  }

  return (
    <section id="prizes" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            Три игры —
            <br className="hidden sm:block" /> один ежедневный тираж
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground text-pretty">
            Выбери игру по цене билета, отметь {NUMBERS_PER_TICKET} чисел из {MAX_NUMBER} и жди вечернего тиража.
            Таблица выигрышей одинакова для всех игр.
          </p>
        </Reveal>

        <div className="relative mt-12 flex items-center gap-3 md:gap-6">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Предыдущая лотерея"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform hover:scale-110"
          >
            <ArrowLeftMark className="h-5 w-5" />
          </button>

          <div className="orbit-border grid flex-1 items-center gap-6 overflow-hidden rounded-3xl bg-card p-6 shadow-2xl shadow-black/30 md:grid-cols-2 md:p-10">
            <div>
              <h3 className="font-heading text-2xl font-bold md:text-3xl">{prize.name}</h3>
              <p className="mt-1 text-sm font-semibold text-gold">{prize.cost}</p>
              <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Максимальный выигрыш
              </p>
              <p className="mt-1 whitespace-nowrap font-display text-3xl font-extrabold text-accent sm:text-4xl md:text-5xl">
                {prize.max}
              </p>
              <dl className="mt-5 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                {tiers.map((tier) => (
                  <div key={tier.matches} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1">
                    <dt className="whitespace-nowrap text-muted-foreground">
                      {tier.matches} из {NUMBERS_PER_TICKET} совпадений
                    </dt>
                    <dd className="whitespace-nowrap font-heading font-bold tabular-nums text-foreground">
                      {tier.prize.toLocaleString('ru-RU')} BYN
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex gap-1.5" role="tablist" aria-label="Слайды лотерей">
                {prizes.map((p, i) => (
                  <button
                    key={p.name}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={p.name}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? 'w-8 bg-primary' : 'w-4 bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="order-first md:order-last">
              <img
                src="/promo-slot.webp"
                alt="Игровые символы: семёрка, клевер и апельсин"
                width={1024}
                height={1024}
                loading="lazy"
                decoding="async"
                className="mx-auto w-full max-w-xs rounded-2xl animate-float"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Следующая лотерея"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform hover:scale-110"
          >
            <ArrowRightMark className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-10 text-center">
          <Button
            size="lg"
            nativeButton={false}
            render={<a href="#how-to" />}
            className="h-14 rounded-full px-10 text-base font-bold uppercase tracking-wide shadow-xl shadow-primary/40 transition-transform hover:scale-[1.03]"
          >
            Играть с бонусом
          </Button>
        </div>
      </div>
    </section>
  )
}
