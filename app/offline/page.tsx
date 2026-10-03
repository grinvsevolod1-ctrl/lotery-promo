import type { Metadata } from "next"
import { LottoBall } from "@/components/lotto-ball"

export const metadata: Metadata = {
  title: "Нет соединения — lotery.by",
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-5 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-60" aria-hidden />
      <div className="relative flex max-w-md flex-col items-center">
        <div className="mb-8 flex items-center gap-3" aria-hidden>
          <LottoBall value="?" size="lg" tone="ghost" />
          <LottoBall value="?" size="lg" tone="ghost" />
          <LottoBall value="?" size="lg" tone="ghost" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Офлайн</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground text-balance">
          Нет соединения с интернетом
        </h1>
        <p className="mt-4 text-muted-foreground text-pretty">
          Билеты и тиражи живут на сервере, поэтому без сети кабинет недоступен. Проверьте подключение и обновите
          страницу.
        </p>
        <a
          href="/cabinet"
          className="cta-shine mt-8 inline-flex h-12 items-center rounded-full bg-primary px-8 font-bold text-primary-foreground"
        >
          Попробовать снова
        </a>
      </div>
    </main>
  )
}
