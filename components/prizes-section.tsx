import Link from 'next/link'
import { TicketMark } from '@/components/icons'
import { Reveal } from '@/components/reveal'
import { Button } from '@/components/ui/button'
import { GAMES, topPrize } from '@/lib/lottery'
import { cn } from '@/lib/utils'

export function PrizesSection() {
  return (
    <section id="games" className="relative scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Три моментальные игры</h2>
          <p className="mx-auto mt-4 max-w-xl text-center leading-relaxed text-muted-foreground text-pretty">
            Отметьте числа на билете — сервер сразу выбрасывает выигрышную комбинацию и показывает, сколько вы угадали.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {GAMES.map((g) => (
            <article key={g.id} className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-card p-6 shadow-xl shadow-black/20">
              <div className="flex items-center gap-3">
                <span className={cn('inline-flex rounded-2xl bg-gradient-to-br p-3 text-primary-foreground', g.tone)}>
                  <TicketMark className="size-6" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-extrabold text-foreground">{g.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {g.pick} из {g.max} · билет {g.cost} BYN
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Главный приз</p>
                <p className="font-display text-4xl font-extrabold text-gold">{topPrize(g).toLocaleString('ru-RU')} BYN</p>
              </div>
              <dl className="flex flex-col gap-1.5 text-sm">
                {Object.entries(g.prizes)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([m, prize]) => (
                    <div key={m} className="flex justify-between gap-3 border-b border-border/40 pb-1.5">
                      <dt className="text-muted-foreground">
                        Угадано {m} из {g.pick}
                      </dt>
                      <dd className="font-semibold tabular-nums text-foreground">{prize.toLocaleString('ru-RU')} BYN</dd>
                    </div>
                  ))}
              </dl>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/sign-up" />}
            className="h-14 rounded-full px-10 text-base font-bold uppercase tracking-wide shadow-xl shadow-primary/40 transition-transform hover:scale-[1.03]"
          >
            Купить первый билет
          </Button>
        </div>
      </div>
    </section>
  )
}
