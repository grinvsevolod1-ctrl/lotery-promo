import { TicketMark } from '@/components/icons'

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-5 py-6">
        <a href="#" className="group flex items-center gap-2.5" aria-label="lotery.by — на главную">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40 transition-transform group-hover:-rotate-6">
            <TicketMark className="h-6 w-6 text-primary-foreground" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold animate-twinkle" aria-hidden="true" />
          </span>
          <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
            lotery<span className="text-gold">.by</span>
          </span>
        </a>
      </div>
    </header>
  )
}
