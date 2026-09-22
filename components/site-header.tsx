import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Phone, Search } from 'lucide-react'

const navItems = [
  { label: 'Лотереи', href: '#games' },
  { label: 'Результаты', href: '#results' },
  { label: 'Проверить билет', href: '#check' },
  { label: 'На благо страны', href: '#impact' },
  { label: 'О нас', href: '#about' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Government top bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-1.5 text-xs">
          <p className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-4 rounded-[1px]"
              style={{
                background:
                  'linear-gradient(to bottom, #c8102e 0 55%, #00963f 55% 100%)',
              }}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              Официальный государственный информационный ресурс
            </span>
            <span className="sm:hidden">Гос. ресурс</span>
          </p>
          <a
            href="tel:7250"
            className="flex items-center gap-1.5 font-medium transition-opacity hover:opacity-80"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Горячая линия: 7250
          </a>
        </div>
      </div>

      {/* Main nav */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="#" className="flex items-center gap-3">
            <Image
              src="/emblem.png"
              alt="Эмблема государственных лотерей"
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover"
            />
            <span className="flex flex-col leading-tight">
              <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
                lotery<span className="text-accent">.by</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Государственные лотереи
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              render={<a href="#check" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Проверить
            </Button>
            <Button
              render={<a href="#games" />}
              nativeButton={false}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Играть
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
