import { Button } from '@/components/ui/button'
import { Clover, Dice5, Hash, Sparkles, Star, Zap } from 'lucide-react'

const games = [
  {
    name: 'Суперлото',
    format: '5 из 36 + 1 из 4',
    prize: '4 850 000 Br',
    price: '5 Br',
    schedule: 'Розыгрыш по субботам',
    icon: Star,
    featured: true,
  },
  {
    name: 'Спортлото 6 из 49',
    format: '6 из 49',
    prize: '1 300 000 Br',
    price: '3 Br',
    schedule: 'Вторник и пятница',
    icon: Clover,
  },
  {
    name: 'Пятёрочка',
    format: '5 из 36',
    prize: '250 000 Br',
    price: '2 Br',
    schedule: 'Ежедневно',
    icon: Hash,
  },
  {
    name: 'КЕНО',
    format: '10 из 80',
    prize: '500 000 Br',
    price: '1 Br',
    schedule: 'Каждые 15 минут',
    icon: Dice5,
  },
  {
    name: 'Ваше лото',
    format: '3 поля',
    prize: '80 000 Br',
    price: '1,5 Br',
    schedule: 'По воскресеньям',
    icon: Sparkles,
  },
  {
    name: 'Моментальная',
    format: 'Мгновенный выигрыш',
    prize: 'до 100 000 Br',
    price: 'от 2 Br',
    schedule: 'Результат сразу',
    icon: Zap,
  },
]

export function GamesSection() {
  return (
    <section id="games" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:py-24">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Каталог
          </p>
          <h2 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground text-balance md:text-4xl">
            Государственные лотереи
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground text-pretty">
            Выберите игру и оформите билет онлайн. Все тиражи проводятся под
            наблюдением тиражной комиссии.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => {
          const Icon = game.icon
          return (
            <article
              key={game.name}
              className={`group relative flex flex-col rounded-xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                game.featured
                  ? 'border-accent/50 ring-1 ring-accent/30'
                  : 'border-border'
              }`}
            >
              {game.featured && (
                <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                  Суперприз
                </span>
              )}
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold text-foreground">
                {game.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{game.format}</p>

              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Джекпот</p>
                <p className="font-heading text-2xl font-extrabold text-primary">
                  {game.prize}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{game.schedule}</span>
                <span className="font-semibold text-foreground">
                  {game.price}
                </span>
              </div>

              <Button
                className="mt-5 w-full group-hover:bg-primary/90"
                variant="default"
              >
                Играть
              </Button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
