import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ArrowRight, Clock } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <Image
        src="/hero-lottery.png"
        alt=""
        fill
        priority
        className="object-cover object-right opacity-40"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/40"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Лицензировано государством · Розыгрыши под контролем комиссии
          </p>

          <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-balance md:text-6xl">
            Крупнейший розыгрыш страны уже в эту субботу
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-relaxed text-primary-foreground/80 text-pretty">
            Государственные лотереи Республики Беларусь — честные тиражи,
            гарантированные выплаты и вклад в социальные программы. Играйте
            ответственно.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              render={<a href="#games" />}
              nativeButton={false}
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Купить билет
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              render={<a href="#results" />}
              nativeButton={false}
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              Результаты тиражей
            </Button>
          </div>
        </div>

        {/* Jackpot card */}
        <div className="lg:justify-self-end">
          <div className="w-full max-w-sm rounded-2xl border border-accent/30 bg-card/95 p-6 text-card-foreground shadow-2xl backdrop-blur">
            <p className="text-sm font-medium text-muted-foreground">
              Суперприз «Суперлото»
            </p>
            <p className="mt-2 font-heading text-5xl font-extrabold tracking-tight text-primary">
              4 850 000
              <span className="ml-1 text-2xl text-accent">Br</span>
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              <Clock className="h-4 w-4 text-accent" aria-hidden="true" />
              До розыгрыша:{' '}
              <span className="font-semibold">2 дня 14 ч 32 мин</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">Тираж</dt>
                <dd className="font-heading text-lg font-bold">№ 1487</dd>
              </div>
              <div className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">Цена билета</dt>
                <dd className="font-heading text-lg font-bold">5 Br</dd>
              </div>
            </dl>
            <Button
              render={<a href="#games" />}
              nativeButton={false}
              className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Участвовать в тираже
            </Button>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="relative border-t border-primary-foreground/10 bg-primary/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-6 text-center sm:grid-cols-4">
          {[
            { value: '32 года', label: 'на рынке лотерей' },
            { value: '1,2 млрд Br', label: 'выплачено выигрышей' },
            { value: '8 900+', label: 'пунктов продаж' },
            { value: '100%', label: 'прозрачность тиражей' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-heading text-2xl font-extrabold text-accent">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-primary-foreground/70">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
