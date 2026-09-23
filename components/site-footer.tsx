import { PlaneMark, OrbChatMark, ShareMark } from '@/components/icons'

const socials = [
  { label: 'Telegram', icon: PlaneMark },
  { label: 'ВКонтакте', icon: OrbChatMark },
  { label: 'Поделиться', icon: ShareMark },
]

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/10 py-12">
      <div className="container-page flex max-w-6xl flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          {socials.map(({ label, icon: Icon }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
        <p className="max-w-xl text-center text-xs leading-relaxed text-muted-foreground/70">
          lotery.by — официальный портал государственных лотерей Республики Беларусь. Доходы от лотерей
          направляются на социальные программы. Играйте ответственно, 18+.
        </p>
        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} lotery.by. Все права защищены.
        </p>
      </div>
    </footer>
  )
}
