'use client'

import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { Wheel } from '@/components/wheel'
import { WHEEL_SEGMENTS } from '@/lib/lottery'
import { useSession } from '@/lib/auth-client'

const LABELS = WHEEL_SEGMENTS.map((segment) => segment.label)

export function FortuneWheel() {
  const { data: session } = useSession()
  return (
    <section id="wheel" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Крути колесо фортуны</h2>
          <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-muted-foreground text-pretty">Один бесплатный спин каждый день для зарегистрированных игроков. Результат сохраняется в кабинете, бонус зачисляется на игровой баланс.</p>
        </Reveal>
        <Reveal className="mt-12 flex flex-col items-center gap-8">
          <Wheel labels={LABELS} size={320} className="w-[min(320px,90vw)]" />
          <Link href={session?.user ? '/cabinet#spin' : '/sign-in'} className="flex min-h-14 items-center justify-center rounded-full bg-accent px-8 font-heading text-base font-bold uppercase tracking-wide text-accent-foreground">
            {session?.user ? 'Крутить в кабинете' : 'Войти и крутить'}
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
