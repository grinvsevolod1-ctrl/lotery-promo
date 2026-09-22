import { Ticket } from 'lucide-react'

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-5 py-6">
        <a href="#" className="flex items-center gap-2" aria-label="lotery.by — на главную">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/40">
            <Ticket className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
          </span>
          <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
            lotery<span className="text-accent">.by</span>
          </span>
        </a>
      </div>
    </header>
  )
}
