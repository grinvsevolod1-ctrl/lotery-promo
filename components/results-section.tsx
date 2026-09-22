import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

const results = [
  {
    game: 'Суперлото',
    draw: '№ 1486',
    date: '14.09.2026',
    numbers: [7, 12, 23, 29, 34],
    bonus: 3,
    fund: '4 200 000 Br',
  },
  {
    game: 'Спортлото 6 из 49',
    draw: '№ 3921',
    date: '13.09.2026',
    numbers: [4, 15, 22, 31, 40, 48],
    fund: '1 150 000 Br',
  },
  {
    game: 'Пятёрочка',
    draw: '№ 8340',
    date: '13.09.2026',
    numbers: [2, 9, 18, 25, 33],
    fund: '210 000 Br',
  },
  {
    game: 'КЕНО',
    draw: '№ 55712',
    date: '13.09.2026',
    numbers: [5, 11, 26, 38, 44, 61, 72, 79],
    fund: '480 000 Br',
  },
]

export function ResultsSection() {
  return (
    <section id="results" className="scroll-mt-24 bg-secondary/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">
              Тиражи
            </p>
            <h2 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground text-balance md:text-4xl">
              Результаты последних розыгрышей
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground text-pretty">
              Официальные итоги публикуются сразу после завершения тиража и
              заверяются протоколом комиссии.
            </p>
          </div>
          <Button variant="outline" className="bg-card">
            Архив тиражей
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-10 overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {results.map((r) => (
              <li
                key={r.draw}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-44">
                  <p className="font-heading font-bold text-foreground">
                    {r.game}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Тираж {r.draw} · {r.date}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {r.numbers.map((n) => (
                    <span
                      key={n}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                    >
                      {n}
                    </span>
                  ))}
                  {r.bonus !== undefined && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {r.bonus}
                    </span>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-muted-foreground">Призовой фонд</p>
                  <p className="font-heading font-bold text-primary">{r.fund}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
