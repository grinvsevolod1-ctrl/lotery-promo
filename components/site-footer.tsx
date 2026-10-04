import Link from 'next/link'
import { PlaneMark, OrbChatMark, TicketMark } from '@/components/icons'
import { ShareButton } from '@/components/share-button'
import { legalLinks, site } from '@/lib/site'

export function SiteFooter() {
  const socials = [
    site.social.telegram && { label: 'Telegram', href: site.social.telegram, icon: PlaneMark },
    site.social.vk && { label: 'ВКонтакте', href: site.social.vk, icon: OrbChatMark },
  ].filter((s): s is { label: string; href: string; icon: typeof PlaneMark } => Boolean(s))

  return (
    <footer className="relative border-t border-white/10 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col items-start gap-4">
            <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name} — на главную`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40">
                <TicketMark className="h-5 w-5 text-primary-foreground" />
              </span>
              <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
                lotery<span className="text-gold">.by</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground/80 text-pretty">
              Промо-акция с бонусными баллами и моментальными билетами. Бонусы не являются денежными средствами и не
              подлежат выплате.
            </p>
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 place-items-center rounded-full border-2 border-destructive font-display text-sm font-extrabold text-destructive"
                aria-label="Только для лиц старше 18 лет"
                title="Только для лиц старше 18 лет"
              >
                18+
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground/80">
                Играйте ответственно.
                <br />
                Участие — только с 18 лет.
              </p>
            </div>
          </div>

          <nav aria-label="Документы" className="flex flex-col gap-2 text-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gold">Документы</p>
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-foreground/75 transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2 text-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gold">Игра</p>
            <Link href="/results" className="text-foreground/75 transition-colors hover:text-foreground">
              Выигрыши
            </Link>
            <Link href="/sign-up" className="text-foreground/75 transition-colors hover:text-foreground">
              Регистрация
            </Link>
            <Link href="/cabinet" className="text-foreground/75 transition-colors hover:text-foreground">
              Личный кабинет
            </Link>
            <a href={`mailto:${site.operator.email}`} className="text-foreground/75 transition-colors hover:text-foreground">
              {site.operator.email}
            </a>
            <div className="mt-3 flex items-center gap-3">
              {socials.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
              <ShareButton />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-muted-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. {site.operator.name}, УНП {site.operator.unp}.
          </p>
          <p>{site.operator.address}</p>
        </div>
      </div>
    </footer>
  )
}
