'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { Confetti } from '@/components/confetti'
import { Wheel, type WheelHandle } from '@/components/wheel'
import { WHEEL_SEGMENTS, pickWeighted } from '@/lib/lottery'
import { useSession } from '@/lib/auth-client'

const LABELS = WHEEL_SEGMENTS.map((s) => s.label)

/**
 * Landing-page demo of the wheel: same segments as the cabinet, but the result
 * is not credited. The real daily spin lives in /cabinet.
 */
export function FortuneWheel() {
  const wheelRef = useRef<WheelHandle>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [confettiKey, setConfettiKey] = useState(0)
  const { data: session } = useSession()

  const spin = async () => {
    if (spinning || !wheelRef.current) return
    setSpinning(true)
    setResult(null)
    const index = pickWeighted(WHEEL_SEGMENTS)
    await wheelRef.current.spinTo(index)
    setSpinning(false)
    setResult(WHEEL_SEGMENTS[index].label)
    setConfettiKey((k) => k + 1)
  }

  return (
    <section id="wheel" className="relative py-16 md:py-24">
      <Confetti fireKey={confettiKey} />
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            Крути колесо фортуны
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center text-sm font-medium text-muted-foreground text-pretty">
            Один бесплатный спин каждый день для зарегистрированных игроков — бонус сразу падает на баланс.
            Здесь можно попробовать колесо в демо-режиме.
          </p>
        </Reveal>

        <Reveal className="mt-12 flex flex-col items-center gap-8">
          <Wheel ref={wheelRef} labels={LABELS} size={320} className="w-[min(320px,90vw)]" />

          <div className="flex min-h-[2rem] items-center">
            {result ? (
              <p className="font-display text-xl font-extrabold text-shimmer" role="status">
                Выпало: {result}!
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
                {spinning ? 'Крутим…' : 'Нажми на кнопку и лови удачу'}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={spin}
              disabled={spinning}
              className="h-14 rounded-full bg-accent px-12 font-heading text-base font-bold uppercase tracking-wide text-accent-foreground shadow-xl shadow-accent/40 transition-transform hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {spinning ? 'Крутится…' : 'Крутить демо'}
            </button>
            <Link
              href={session?.user ? '/cabinet#spin' : '/sign-up'}
              className="h-14 rounded-full border border-gold/40 px-8 font-heading text-base font-bold uppercase leading-[3.5rem] tracking-wide text-gold transition-colors hover:bg-gold/10"
            >
              {session?.user ? 'Настоящий спин в кабинете' : 'Войти и крутить по-настоящему'}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
