'use client'

import Link from 'next/link'
import { Wheel } from '@/components/wheel'
import { WHEEL_SEGMENTS } from '@/lib/lottery'
import { useSession } from '@/lib/auth-client'

const LABELS = WHEEL_SEGMENTS.map((segment) => segment.label)
const wheelMax = Math.max(...WHEEL_SEGMENTS.map((s) => s.amount))

const PERKS = ['1 спин каждые 24 часа', `Призы до ${wheelMax} BYN`, 'Зачисление сразу на баланс']

export function FortuneWheel() {
  const { data: session } = useSession()
  return (
    <section id="wheel" aria-labelledby="wheel-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-10 sm:px-5 md:pt-14">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-[32px] bg-card p-6 ring-1 ring-border sm:p-10 md:grid-cols-[1fr_auto] md:gap-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[radial-gradient(circle,rgb(255_100_22/0.14),transparent_70%)]"
        />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Колесо удачи</p>
          <h2 id="wheel-title" className="mt-3 font-display text-3xl font-black leading-[1.05] tracking-tight text-balance sm:text-5xl">
            Бесплатный спин каждый день
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
            Заходите в раздел игр, крутите колесо и забирайте бонус на игровой баланс.
          </p>
          <ul className="mt-6 flex flex-col gap-2.5">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm font-semibold text-foreground">
                <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden>
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <Link
            href={session?.user ? '/play/wheel' : '/sign-up'}
            className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-foreground px-8 text-base font-bold text-background transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] max-sm:w-full"
          >
            {session?.user ? 'Крутить колесо' : 'Получить спин'}
          </Link>
        </div>
        <Wheel labels={LABELS} size={300} className="relative mx-auto w-[min(300px,78vw)]" />
      </div>
    </section>
  )
}
