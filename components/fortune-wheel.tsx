'use client'

import Link from 'next/link'
import { Wheel } from '@/components/wheel'
import { WHEEL_SEGMENTS } from '@/lib/lottery'
import { useSession } from '@/lib/auth-client'

const LABELS = WHEEL_SEGMENTS.map((segment) => segment.label)
const wheelMax = Math.max(...WHEEL_SEGMENTS.map((s) => s.amount))

export function FortuneWheel() {
  const { data: session } = useSession()
  return (
    <section id="wheel" aria-labelledby="wheel-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-10 sm:px-5 md:pt-14">
      <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">Колесо удачи</h2>
      <div className="mt-5 grid items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#7b2ff7] to-[#5a12d6] p-6 text-white sm:p-10 md:grid-cols-[1fr_auto]">
        <div>
          <p id="wheel-title" className="font-display text-2xl font-black leading-tight tracking-tight text-balance sm:text-4xl">
            Бесплатный спин каждый день
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 text-pretty sm:text-base">
            Крутите колесо в личном кабинете и получайте до {wheelMax} BYN на игровой баланс.
          </p>
          <Link
            href={session?.user ? '/cabinet#spin' : '/sign-in'}
            className="mt-6 inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-extrabold uppercase tracking-wide text-[#5a12d6] transition-transform hover:scale-[1.03]"
          >
            {session?.user ? 'Крутить колесо' : 'Участвовать'}
          </Link>
        </div>
        <Wheel labels={LABELS} size={260} className="mx-auto w-[min(260px,75vw)]" />
      </div>
    </section>
  )
}
