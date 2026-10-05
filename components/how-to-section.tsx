import Link from 'next/link'
import { GAMES, WELCOME_BONUS } from '@/lib/lottery'

const cheapestTicket = Math.min(...GAMES.map((g) => g.cost))

const steps = [
  { n: '1', title: 'Зарегистрируйтесь', desc: `+${WELCOME_BONUS} BYN на баланс сразу` },
  { n: '2', title: 'Отметьте числа', desc: `в любой из ${GAMES.length} игр или случайно — от ${cheapestTicket} BYN` },
  { n: '3', title: 'Узнайте результат', desc: 'сразу после покупки, выигрыш — на баланс' },
]

export function HowToSection() {
  return (
    <section id="how-to" aria-labelledby="how-to-title" className="mx-auto max-w-6xl px-4 pt-10 sm:px-5 md:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="how-to-title" className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          Как играть
        </h2>
        <Link
          href="/sign-up"
          className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-xs font-extrabold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          Получить бонус
        </Link>
      </div>
      <ol className="mt-5 grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.n} className="flex items-start gap-4 rounded-3xl bg-card p-5 shadow-sm">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary font-display text-lg font-black text-primary-foreground">
              {step.n}
            </span>
            <span>
              <span className="block font-display text-base font-extrabold text-foreground">{step.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{step.desc}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
