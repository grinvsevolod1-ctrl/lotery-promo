import Link from 'next/link'
import { PlaneMark, OrbChatMark } from '@/components/icons'
import { BrandLogo } from '@/components/brand-logo'
import { ShareButton } from '@/components/share-button'
import { legalLinks, site } from '@/lib/site'

export function SiteFooter() {
  const socials = [
    site.social.telegram && { label: 'Telegram', href: site.social.telegram, icon: PlaneMark },
    site.social.vk && { label: 'ВКонтакте', href: site.social.vk, icon: OrbChatMark },
  ].filter((s): s is { label: string; href: string; icon: typeof PlaneMark } => Boolean(s))

  return (
    <footer className="mt-14 bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BrandLogo className="text-2xl" />
          <div className="flex items-center gap-2">
            {socials.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="grid size-11 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Icon className="size-5" />
              </a>
            ))}
            <ShareButton />
          </div>
        </div>

        <div className="grid gap-8 text-sm md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Контакты</p>
            <p className="text-muted-foreground">{site.operator.address}</p>
            <p className="text-muted-foreground">УНП {site.operator.unp}</p>
            <p className="text-muted-foreground">{site.operator.hours}</p>
            <a href={`tel:${site.operator.phone.replace(/[^\d+]/g, '')}`} className="font-semibold text-accent hover:underline">
              {site.operator.phone}
            </a>
            <a href={`mailto:${site.operator.email}`} className="font-semibold text-accent hover:underline">
              {site.operator.email}
            </a>
          </div>

          <nav aria-label="Документы" className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Документы</p>
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Навигация" className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Навигация</p>
            <Link href="/#games" className="text-muted-foreground transition-colors hover:text-foreground">
              Лотереи
            </Link>
            <Link href="/results" className="text-muted-foreground transition-colors hover:text-foreground">
              Выигрыши
            </Link>
            <Link href="/sign-up" className="text-muted-foreground transition-colors hover:text-foreground">
              Регистрация
            </Link>
            <Link href="/cabinet" className="text-muted-foreground transition-colors hover:text-foreground">
              Личный кабинет
            </Link>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
            © {new Date().getFullYear()} {site.name}. {site.operator.name}
          </p>
        </div>
      </div>
    </footer>
  )
}
