import Link from 'next/link'
import { MailMark, OrbChatMark } from '@/components/icons'
import { BrandLogo } from '@/components/brand-logo'
import { CardBrandMark } from '@/components/cabinet/card-brand-mark'
import { ShareButton } from '@/components/share-button'
import { legalLinks, site } from '@/lib/site'
import { cn } from '@/lib/utils'

const sectionLinks = [
  { href: '/#catalog', label: 'Игры' },
  { href: '/#games', label: 'Лотереи' },
  { href: '/#wheel', label: 'Колесо удачи' },
  { href: '/results', label: 'Выигрыши' },
  { href: '/sign-up', label: 'Регистрация' },
  { href: '/cabinet', label: 'Личный кабинет' },
  { href: '/jobs', label: 'Вакансии' },
] as const

const paymentBrands = ['visa', 'mastercard', 'belkart', 'mir'] as const

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-widest text-foreground">{children}</p>
}

function FooterLinks({ links }: { links: ReadonlyArray<{ href: string; label: string }> }) {
  return (
    <ul className="flex flex-col gap-2.5 text-sm">
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-8 pt-10 sm:gap-10 sm:px-5 sm:py-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-10 lg:grid-cols-4 lg:gap-8">
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-1">
            <BrandLogo className="text-2xl" />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
              Моментальные лотереи онлайн: выберите числа, купите билет и сразу узнайте результат. Выигрыш
              зачисляется на баланс мгновенно.
            </p>
            <div className="flex items-center gap-2" aria-label="Способы оплаты">
              {paymentBrands.map((brand) => (
                <span
                  key={brand}
                  className={cn(
                    'flex h-8 items-center rounded-md bg-secondary px-2 text-foreground',
                    brand === 'visa' && 'text-[#1a1f71]',
                  )}
                >
                  <CardBrandMark brand={brand} className="h-4" />
                </span>
              ))}
            </div>
          </div>

          <nav aria-label="Разделы сайта" className="flex flex-col gap-4">
            <FooterHeading>Разделы</FooterHeading>
            <FooterLinks links={sectionLinks} />
          </nav>

          <nav aria-label="Документы" className="flex flex-col gap-4">
            <FooterHeading>Документы</FooterHeading>
            <FooterLinks links={legalLinks} />
          </nav>

          <div className="col-span-2 flex flex-col gap-4 rounded-3xl bg-secondary/60 p-5 lg:col-span-1 lg:rounded-none lg:bg-transparent lg:p-0">
            <FooterHeading>Поддержка</FooterHeading>
            <div className="flex flex-col gap-2.5 text-sm">
              <p className="text-muted-foreground">Отвечаем {site.operator.hours}</p>
              <a
                href={`mailto:${site.operator.email}`}
                className="inline-flex items-center gap-2 font-semibold text-accent hover:underline"
              >
                <MailMark className="size-4" />
                {site.operator.email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/cabinet/support"
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 lg:flex-none lg:justify-start lg:bg-secondary lg:text-foreground lg:transition-colors lg:hover:bg-primary lg:hover:text-primary-foreground lg:hover:opacity-100"
              >
                <OrbChatMark className="size-5" />
                Написать в чат
              </Link>
              <ShareButton />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between [&>p]:text-pretty">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-destructive font-display text-xs font-extrabold text-destructive"
              aria-label="Только для лиц старше 18 лет"
              title="Только для лиц старше 18 лет"
            >
              18+
            </span>
            <p>Играйте ответственно. Участие — только с 18 лет.</p>
          </div>
          <p>
            © {new Date().getFullYear()} {site.name}. Срок акции: {site.promoPeriod.from} — {site.promoPeriod.to}
          </p>
        </div>
      </div>
    </footer>
  )
}
