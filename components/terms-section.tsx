import { Button } from '@/components/ui/button'

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

        <div className="mt-10 text-center">
          <Button
            size="lg"
            nativeButton={false}
            render={<a href="#" />}
            className="h-14 rounded-full px-10 text-base font-bold uppercase tracking-wide shadow-xl shadow-primary/40 transition-transform hover:scale-[1.03]"
          >
            Скачать приложение
          </Button>
        </div>
      </div>
    </section>
  )
}
