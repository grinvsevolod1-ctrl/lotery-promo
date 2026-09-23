'use client'

import { useState } from 'react'
import { ArrowLeftMark, ArrowRightMark } from '@/components/icons'
import { Reveal } from '@/components/reveal'
import { Button } from '@/components/ui/button'

const prizes = [
  { name: 'Двойной успех', max: '110 300 BYN' },
  { name: 'Суперлото', max: '1 000 000 BYN' },
  { name: 'Пятёрочка', max: '85 000 BYN' },
  { name: 'КЕНО', max: '250 000 BYN' },
  { name: 'Спортпрогноз', max: '420 000 BYN' },
]

export function PrizesSection() {
  const [index, setIndex] = useState(0)
  const prize = prizes[index]

  const go = (dir: number) => {
    setIndex((i) => (i + dir + prizes.length) % prizes.length)
  }

  return (
    <section id="prizes" className="section-y relative">
      <div className="container-page max-w-6xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            Присоединяйся ко вселенной
            <br className="hidden sm:block" /> государственных лотерей
          </h2>
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
              <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Максимальный выигрыш
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold text-accent md:text-5xl">
                {prize.max}
              </p>
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
                src="/promo-slot.png"
                alt="Игровые символы: семёрка, клевер и апельсин"
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
