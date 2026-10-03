import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LottoBall } from "@/components/lotto-ball"
import { SiteHeader } from "@/components/site-header"

export default function NotFound() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-60" aria-hidden />
      <SiteHeader />
      <main className="relative flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-28 text-center">
        <div className="mb-8 flex items-center gap-3" aria-hidden>
          <LottoBall value={4} size="lg" tone="hit" className="animate-float" />
          <LottoBall value={0} size="lg" className="animate-float [animation-delay:0.3s]" />
          <LottoBall value={4} size="lg" tone="hit" className="animate-float [animation-delay:0.6s]" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Ошибка 404</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground text-balance sm:text-4xl">
          Эта комбинация не выпала
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground text-pretty">
          Страницы с таким адресом нет. Возможно, ссылка устарела или в ней опечатка.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" nativeButton={false} render={<Link href="/" />} className="cta-shine h-12 rounded-full px-8 font-bold">
            На главную
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/results" />}
            className="h-12 rounded-full border-gold/40 bg-transparent px-8 font-bold text-gold hover:bg-gold/10 hover:text-gold"
          >
            Результаты тиражей
          </Button>
        </div>
      </main>
    </div>
  )
}
