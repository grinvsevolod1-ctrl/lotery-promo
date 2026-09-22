import { Activity, GraduationCap, HeartHandshake, Landmark } from 'lucide-react'

const programs = [
  {
    icon: Activity,
    title: 'Спорт',
    text: 'Поддержка детско-юношеских спортивных школ и национальных команд.',
    share: '38%',
  },
  {
    icon: GraduationCap,
    title: 'Образование',
    text: 'Оснащение учреждений образования и стипендии одарённым учащимся.',
    share: '24%',
  },
  {
    icon: HeartHandshake,
    title: 'Социальная помощь',
    text: 'Программы помощи семьям, ветеранам и людям с инвалидностью.',
    share: '22%',
  },
  {
    icon: Landmark,
    title: 'Культура',
    text: 'Сохранение культурного наследия и поддержка учреждений культуры.',
    share: '16%',
  },
]

export function SocialImpact() {
  return (
    <section id="impact" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">
          Куда идут средства
        </p>
        <h2 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground text-balance md:text-4xl">
          Каждый билет работает на благо страны
        </h2>
        <p className="mt-3 text-muted-foreground text-pretty">
          Часть выручки от государственных лотерей направляется в бюджет и
          финансирует социально значимые программы. За последний год на
          общественные нужды перечислено более{' '}
          <span className="font-semibold text-foreground">64 млн Br</span>.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {programs.map((p) => {
          const Icon = p.icon
          return (
            <div
              key={p.title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <span className="font-heading text-2xl font-extrabold text-primary">
                  {p.share}
                </span>
              </div>
              <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                {p.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {p.text}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
