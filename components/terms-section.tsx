import Link from 'next/link'
import { InstallAppButton } from '@/components/pwa'

export function TermsSection() {
  return (
    <section id="terms" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="rounded-3xl bg-card/60 p-6 text-sm leading-relaxed text-muted-foreground md:p-8">
            <p className="font-semibold text-foreground">
              Супер Колёса Фортуны и Колёса Фортуны начисляются в течение 30 минут после регистрации и
              выполнения условий акции:
            </p>
            <ul className="mt-4 space-y-2">
              <li>За покупку билета от 7 до 14 BYN — 1 Колесо Фортуны.</li>
              <li>За покупку билета от 15 до 49 BYN — 2 Супер Колеса Фортуны.</li>
              <li>За покупку билета от 50 BYN и более — 3 Супер Колеса + 1 Колесо Фортуны.</li>
            </ul>
            <p className="mt-4">
              В акции можно принять участие 3 раза и получить бонус за первые 3 покупки. Срок участия —
              10 дней с момента регистрации. Максимальный выигрыш в Супер Колесе Фортуны — 200 BYN, в
              Мега Колесе Фортуны — 10 000 BYN.
            </p>
            <p className="mt-4 font-semibold text-accent">
              Срок проведения акции: 01.08.25 — 31.12.26
            </p>
            <p className="mt-4 text-xs text-muted-foreground/70">
              Играйте ответственно. Участие в лотереях разрешено лицам старше 18 лет.
            </p>
          </div>
          <div>
            <img
              src="/promo-phone.webp"
              alt="Смартфоны с приложением лотереи и Гранд Джекпотом"
              width={1024}
              height={1024}
              loading="lazy"
              decoding="async"
              className="mx-auto w-full max-w-md drop-shadow-2xl"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <InstallAppButton />
          <p className="text-xs text-muted-foreground/70">
            Сайт работает как приложение: добавьте его на главный экран, чтобы открывать кабинет в одно касание.{' '}
            <Link href="/rules" className="font-semibold text-gold underline-offset-4 hover:underline">
              Полные правила акции
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
