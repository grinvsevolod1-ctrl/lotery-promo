import { Button } from '@/components/ui/button'

const steps = [
  { title: '1 Колесо Фортуны', desc: 'за покупку билета от 7 до 14 BYN' },
  { title: '2 Супер Колеса Фортуны', desc: 'за покупку билета от 15 до 49 BYN' },
  { title: '3 Супер Колеса + 1 Колесо', desc: 'за покупку билета от 50 BYN и более' },
]

export function HowToSection() {
  return (
    <section id="how-to" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-center font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Как получить бонус?
        </h2>

        <div className="mt-12 grid items-center gap-8 rounded-4xl bg-gradient-to-br from-[oklch(0.4_0.2_305)] to-[oklch(0.3_0.14_302)] p-6 shadow-2xl shadow-black/30 md:grid-cols-2 md:p-12">
          <div>
            <p className="font-heading text-xl font-bold leading-snug text-balance">
              Покупай билеты и получи до 7 Супер Колёс Фортуны и Колёс Фортуны:
            </p>
            <ul className="mt-6 space-y-3">
              {steps.map((step) => (
                <li
                  key={step.title}
                  className="flex items-start gap-3 rounded-2xl bg-background/95 px-4 py-3 shadow-lg"
                >
                  <span
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-gradient-to-br from-primary to-accent shadow"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block font-heading text-base font-bold text-card">
                      {step.title}
                    </span>
                    <span className="block text-sm font-medium text-primary">{step.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <img
              src="/promo-wheels.png"
              alt="Золотое и синее колёса фортуны"
              className="mx-auto w-full max-w-sm drop-shadow-2xl"
            />
          </div>
        </div>

        <div className="mt-10 text-center">
          <Button
            size="lg"
            nativeButton={false}
            render={<a href="#terms" />}
            className="h-14 rounded-full px-10 text-base font-bold uppercase tracking-wide shadow-xl shadow-primary/40 transition-transform hover:scale-[1.03]"
          >
            Получить бонус
          </Button>
        </div>
      </div>
    </section>
  )
}
