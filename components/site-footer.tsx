import Image from 'next/image'
import { ShieldCheck } from 'lucide-react'

const columns = [
  {
    title: 'Лотереи',
    links: ['Суперлото', 'Спортлото 6 из 49', 'Пятёрочка', 'КЕНО', 'Моментальные'],
  },
  {
    title: 'Игрокам',
    links: ['Проверить билет', 'Результаты тиражей', 'Правила игр', 'Получение выигрыша', 'Личный кабинет'],
  },
  {
    title: 'О компании',
    links: ['Об операторе', 'Лицензии и документы', 'Тиражная комиссия', 'Пункты продаж', 'Контакты'],
  },
]

export function SiteFooter() {
  return (
    <footer id="about" className="scroll-mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/emblem.png"
                alt="Эмблема государственных лотерей"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="font-heading text-lg font-extrabold">
                lotery<span className="text-accent">.by</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-primary-foreground/70">
              Официальный портал государственных лотерей Республики Беларусь.
              Оператор действует на основании государственной лицензии.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary-foreground/15 px-3 py-2 text-xs text-primary-foreground/80">
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              Играй ответственно · 18+
            </div>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-primary-foreground/60">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-primary-foreground/80 transition-colors hover:text-accent"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/60 sm:flex-row sm:items-center">
          <p>© 2026 Государственные лотереи Республики Беларусь. Все права защищены.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="transition-colors hover:text-accent">
              Пользовательское соглашение
            </a>
            <a href="#" className="transition-colors hover:text-accent">
              Политика конфиденциальности
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
